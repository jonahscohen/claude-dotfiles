#!/bin/sh
input=$(cat)

# Graceful degradation: if jq isn't installed, render a minimal statusline
# instead of failing the hook with command-not-found errors. Claude Code
# would otherwise spam the prompt with errors on every render.
if ! command -v jq >/dev/null 2>&1; then
  printf 'no-jq | install with: brew install jq'
  exit 0
fi

# Project name: use session_name if set, else basename of project_dir
project_name=$(echo "$input" | jq -r '.session_name // empty')
if [ -z "$project_name" ]; then
  project_dir=$(echo "$input" | jq -r '.workspace.project_dir // empty')
  if [ -n "$project_dir" ]; then
    project_name=$(basename "$project_dir")
  fi
fi

# Current directory (basename)
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
dir_name=""
if [ -n "$cwd" ]; then
  dir_name=$(basename "$cwd")
fi

# Git branch and changes (skip optional locks to avoid contention)
branch=""
git_added=""
git_deleted=""
if [ -n "$cwd" ] && [ -d "$cwd/.git" ] || git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" -c core.gvfs-prune=false --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
  git_stat=$(git -C "$cwd" --no-optional-locks diff --shortstat HEAD 2>/dev/null)
  if [ -n "$git_stat" ]; then
    git_added=$(echo "$git_stat" | sed -n 's/.* \([0-9]*\) insertion.*/\1/p')
    git_deleted=$(echo "$git_stat" | sed -n 's/.* \([0-9]*\) deletion.*/\1/p')
  fi
fi

# Usage percentages
ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
session_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

# Helper: build a solid-color progress bar
# Usage: make_bar <used_int> <bar_width>
make_bar() {
  _pct="$1"
  _width="$2"
  _filled=$(( _pct * _width / 100 ))
  _empty=$(( _width - _filled ))
  _bar=""
  _i=0
  while [ $_i -lt $_filled ]; do
    _bar="${_bar}\033[42m \033[0m"
    _i=$(( _i + 1 ))
  done
  _i=0
  while [ $_i -lt $_empty ]; do
    _bar="${_bar}\033[32m⣿\033[0m"
    _i=$(( _i + 1 ))
  done
  printf '%s' "$_bar"
}

# Build line 1: project, directory, branch with labels
line1=""

if [ -n "$project_name" ]; then
  line1=$(printf '%b' "project \033[1;36m${project_name}\033[0m")
fi

if [ -n "$dir_name" ]; then
  [ -n "$line1" ] && line1="${line1}  "
  line1="${line1}dir \033[1;36m${dir_name}\033[0m"
fi

if [ -n "$branch" ]; then
  [ -n "$line1" ] && line1="${line1}  \033[90m|\033[0m  "
  line1="${line1}branch \033[1;36m${branch}\033[0m"
  changes=""
  if [ -n "$git_added" ] && [ "$git_added" -gt 0 ] 2>/dev/null; then
    changes="\033[32m+${git_added}\033[0m"
  fi
  if [ -n "$git_deleted" ] && [ "$git_deleted" -gt 0 ] 2>/dev/null; then
    [ -n "$changes" ] && changes="${changes} "
    changes="${changes}\033[31m-${git_deleted}\033[0m"
  fi
  if [ -n "$changes" ]; then
    line1="${line1} ${changes}"
  fi
fi

# Build line 2: usage bars
bar_width=10
usage_parts=""

if [ -n "$ctx_pct" ]; then
  ctx_int=$(printf '%.0f' "$ctx_pct")
  ctx_bar=$(make_bar "$ctx_int" "$bar_width")
  usage_parts="ctx ${ctx_bar} ${ctx_int}%"
fi

if [ -n "$session_pct" ]; then
  session_int=$(printf '%.0f' "$session_pct")
  session_bar=$(make_bar "$session_int" "$bar_width")
  if [ -n "$usage_parts" ]; then
    usage_parts="${usage_parts} | session ${session_bar} ${session_int}%"
  else
    usage_parts="session ${session_bar} ${session_int}%"
  fi
fi

if [ -n "$week_pct" ]; then
  week_int=$(printf '%.0f' "$week_pct")
  week_bar=$(make_bar "$week_int" "$bar_width")
  if [ -n "$usage_parts" ]; then
    usage_parts="${usage_parts} | week ${week_bar} ${week_int}%"
  else
    usage_parts="week ${week_bar} ${week_int}%"
  fi
fi

# Output
printf '%b\n' "$line1"
if [ -n "$usage_parts" ]; then
  printf '%b\n' "usage ${usage_parts}"
fi
