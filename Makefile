ifeq ($(OS), Windows_NT)
	RM := powershell -Command Remove-Item -Recurse
	ZIP := powershell $(abspath build/zip.ps1)
else
	RM := rm -rf
	ZIP := zip -r
endif

# Source: https://stackoverflow.com/a/12959764
rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

.PHONY: all clean
all: firefox chrome
clean: clean-decoder clean-extension

#################
# Decoder rules #
#################

DECODER_SOURCES := $(call rwildcard,decoder/src/,*.rs) decoder/Cargo.toml decoder/Cargo.lock
WASM_FILE := decoder/pkg/gif_controls_decoder_bg.wasm

.PHONY: decoder clean-decoder
decoder: $(WASM_FILE)
$(WASM_FILE): $(DECODER_SOURCES)
	cd decoder && wasm-pack build --target web

clean-decoder:
	-$(RM) decoder/pkg
	-cd decoder && cargo clean

###################
# Extension rules #
###################

EXTENSION_SOURCES := $(call rwildcard,webextension/,*) $(call rwildcard,public/,*) wxt.config.ts tsconfig.json

.PHONY: firefox chrome clean-extension
firefox: .output/firefox-mv2
.output/firefox-mv2: $(WASM_FILE) node_modules $(EXTENSION_SOURCES)
	npx wxt build -b firefox

chrome: .output/chrome-mv3
.output/chrome-mv3:  $(WASM_FILE) node_modules $(EXTENSION_SOURCES)
	npx wxt build -b chrome

node_modules: package.json package-lock.json
	npm install

clean-extension:
	-npx --no-install wxt clean
	-$(RM) .output
	-$(RM) node_modules

########
# Zips #
########

.PHONY: zip zip-sources zip-firefox zip-chrome
zip: zip-sources zip-firefox zip-chrome

zip-sources: .output/sources.zip
.output/sources.zip: $(DECODER_SOURCES) $(EXTENSION_SOURCES) $(wildcard *.*) build
	-mkdir .output
	$(ZIP) $@ $^

zip-firefox: .output/firefox-mv2.zip
zip-chrome: .output/chrome-mv3.zip
.output/%.zip: .output/%
	cd $< && $(ZIP) ../$(notdir $@) .
