#!/bin/bash
set -eo pipefail

# Install from monorepo root so all workspace deps are resolved
cd ..
pnpm install --frozen-lockfile
