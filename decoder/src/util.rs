use thiserror::Error;

const MIN_CODE_SIZE: u8 = 2;
const MAX_CODE_SIZE: u8 = 12;
const MAX_CODE_TABLE_SIZE: usize = 1 << MAX_CODE_SIZE;

#[derive(Error, Debug)]
pub enum LZWError {
    #[error(
        "Code size {0} is outside the allowed range of [{min}, 8]",
        min = MIN_CODE_SIZE,
    )]
    CodeSizeOutOfRange(u8),

    #[error("Bitstream is missing the end-of-information code")]
    MissingEndCode,

    #[error("Code is out of bounds ({0} > {1})")]
    CodeOutOfBounds(usize, usize),
}

// My kingdom for a trait alias
pub struct LZWIterator<Inner: Iterator<Item = u8>> {
    bits: BitCursor<Inner>,
    min_code_size: u8,
    cur_code_size: u8,

    code_table: Vec<Vec<u8>>,
    clear_code: usize,
    end_code: usize,
    prev_code: Option<usize>,

    finished: bool,
}

impl<Inner: Iterator<Item = u8>> LZWIterator<Inner> {
    pub fn new<IntoIter>(seq: IntoIter, min_code_size: u8) -> Result<Self, LZWError>
    where
        IntoIter: IntoIterator<Item = u8, IntoIter = Inner>,
    {
        if min_code_size < MIN_CODE_SIZE || min_code_size > 8 {
            return Err(LZWError::CodeSizeOutOfRange(min_code_size));
        }

        let n = 1 << min_code_size;
        let code_table = (0..n)
            // i is at most n - 1 == (1 << 8) - 1 == 255, so unwrapping is fine
            .map(|i| vec![i.try_into().unwrap()])
            // Add dummy items so we can index past clear/end codes
            .chain([vec![], vec![]])
            .collect();

        Ok(Self {
            bits: BitCursor::new(seq),
            min_code_size,
            cur_code_size: min_code_size + 1,
            code_table,
            clear_code: n,
            end_code: n + 1,
            prev_code: None,
            finished: false,
        })
    }

    fn next_sequence(&mut self) -> NextSeqResult {
        let code = match self.bits.take_n(self.cur_code_size) {
            Some(n) => n,
            // Treat truncated LZW data as an early end code. Will probably be
            // invalid, but that's handled further up the stack.
            None => return NextSeqResult::EndCode,
        };

        // Clear and end codes
        if code == self.end_code {
            self.finished = true;
            return NextSeqResult::EndCode;
        } else if code == self.clear_code {
            self.handle_clear_code();
            return NextSeqResult::ClearCode;
        }

        // Code is completely out of range (not even a new code)
        if code > self.code_table.len() {
            return NextSeqResult::Err(LZWError::CodeOutOfBounds(code, self.code_table.len()));
        }

        // Extend code table if possible
        if self.code_table.len() < MAX_CODE_TABLE_SIZE {
            if let Some(prev_code) = self.prev_code {
                let next_symbol = if code == self.code_table.len() {
                    // New code
                    self.code_table[prev_code][0]
                } else {
                    // Existing code
                    self.code_table[code][0]
                };

                let new_sequence = {
                    let src = &self.code_table[prev_code];
                    let mut v = vec![0; src.len() + 1];
                    v[0..(src.len())].copy_from_slice(&src);
                    v[src.len()] = next_symbol;
                    v
                };
                self.code_table.push(new_sequence);
            }
        }

        // Increase code size if necessary
        if self.cur_code_size < MAX_CODE_SIZE && self.code_table.len() == 1 << self.cur_code_size {
            self.cur_code_size += 1;
        }

        self.prev_code = Some(code);
        NextSeqResult::Ok(self.code_table[code].clone())
    }

    fn handle_clear_code(&mut self) {
        // Reset code table by truncating it
        self.code_table.truncate((1 << self.min_code_size) + 2);
        self.cur_code_size = self.min_code_size + 1;
        self.prev_code = None
    }
}

enum NextSeqResult {
    Ok(Vec<u8>),
    ClearCode,
    EndCode,
    Err(LZWError),
}

impl<Inner: Iterator<Item = u8>> Iterator for LZWIterator<Inner> {
    type Item = Result<Vec<u8>, LZWError>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.finished {
            return None;
        }

        loop {
            match self.next_sequence() {
                NextSeqResult::Ok(seq) => break Some(Ok(seq)),
                NextSeqResult::ClearCode => {}
                NextSeqResult::EndCode => break None,
                NextSeqResult::Err(e) => break Some(Err(e)),
            }
        }
    }
}

struct BitCursor<I: Iterator<Item = u8>> {
    iterator: I,
    cur: usize,
    counter: u32,
    finished: bool,
}

impl<I: Iterator<Item = u8>> BitCursor<I> {
    pub fn new(seq: impl IntoIterator<Item = u8, IntoIter = I>) -> Self {
        Self {
            iterator: seq.into_iter(),
            cur: 0,
            counter: 0,
            finished: false,
        }
    }

    pub fn take_n(&mut self, n: u8) -> Option<usize> {
        if self.finished {
            return None;
        }

        let mut output = 0;
        for i in 0..n {
            if self.counter == 0 {
                self.cur = if let Some(n) = self.iterator.next() {
                    n.into()
                } else {
                    self.finished = true;
                    return None;
                };

                self.counter = 8;
            }
            output |= (self.cur & 1) << i;
            self.cur >>= 1;
            self.counter -= 1;
        }

        Some(output)
    }
}
