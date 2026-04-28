# claude-dotfiles
# Type `make` for the interactive TUI. Other targets shortcut to install.sh flags.
#
# Examples:
#   make                     Interactive checkbox TUI (default)
#   make all                 Install everything non-interactively
#   make minimal             claude + memory + skills + nvm
#   make memory              Just the memory subsystem (additive, no overwrites)
#   make skills              Just the skill bundle
#   make ghostty shaders     Two components at once (combined into --only csv)
#   make help                Show install.sh help and these make targets

.PHONY: install all minimal none help \
        claude memory skills statusline ghostty shaders cmux discord nvm yesplease

# When the user types one or more component-name targets (e.g. `make memory skills`),
# combine them into a single comma-separated --only invocation and run install.sh once.
COMPONENTS := claude memory skills statusline ghostty shaders cmux discord nvm yesplease
ONLY_TARGETS := $(filter $(COMPONENTS),$(MAKECMDGOALS))

# Default: interactive TUI
install:
	@bash install.sh

# Presets
all:
	@bash install.sh --yes

minimal:
	@bash install.sh --preset minimal

none:
	@bash install.sh --dry-run --preset none

help:
	@bash install.sh --help
	@echo ""
	@echo "Make targets (sexier than ./install.sh):"
	@echo "  make                     Interactive checkbox TUI (default)"
	@echo "  make all                 Install everything non-interactively"
	@echo "  make minimal             claude + memory + skills + nvm"
	@echo "  make none                Dry-run with nothing picked (sanity check)"
	@echo "  make <component>         Install just one component"
	@echo "  make <a> <b> <c>         Install several at once (combined into --only)"
	@echo "  make help                This help"

# Per-component targets. When multiple are specified, the first match runs the
# installer once with all of them combined; subsequent targets are no-ops so
# Make doesn't try to run install.sh per-target.
$(COMPONENTS):
	@if [ "$@" = "$(firstword $(ONLY_TARGETS))" ]; then \
	  bash install.sh --only $(shell echo $(ONLY_TARGETS) | tr ' ' ','); \
	fi

.DEFAULT_GOAL := install
