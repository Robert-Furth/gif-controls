ifeq ($(OS), Windows_NT)
	RM := powershell -Command Remove-Item -Recurse
else
	RM := rm -rf
endif

# Source: https://stackoverflow.com/a/12959764
rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

.PHONY: all clean
all: firefox chrome
clean: clean-decoder clean-extension

WASM_FILE := decoder/pkg/gif_controls_decoder_bg.wasm

.PHONY: decoder clean-decoder
decoder: $(WASM_FILE)
$(WASM_FILE): $(call rwildcard,decoder/src/,*.rs) decoder/Cargo.toml decoder/Cargo.lock
	cd decoder && wasm-pack build --target web

clean-decoder:
	-$(RM) decoder/pkg
	-cd decoder && cargo clean

EXTENSION_DEPS := $(WASM_FILE) node_modules $(call rwildcard,webextension/,*) $(call rwildcard,public/,*) wxt.config.ts tsconfig.json

.PHONY: firefox chrome clean-extension
firefox: .output/firefox-mv2
.output/firefox-mv2: $(EXTENSION_DEPS)
	npx wxt build -b firefox

chrome: .output/chrome-mv3
.output/chrome-mv3: $(EXTENSION_DEPS)
	npx wxt build -b chrome

node_modules: package.json package-lock.json
	npm install

clean-extension:
	-npx wxt clean
	-$(RM) .output
