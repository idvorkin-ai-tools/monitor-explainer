default:
    @just --list

# Run dev server (use custom port to avoid conflicts)
dev PORT="5174":
    npm run dev -- --port {{PORT}} --host

# Build for production
build:
    npm run build

# Preview production build
preview:
    npm run preview

# Deploy to surge.sh (staging)
deploy-stage:
    npx surge dist $(gh repo view --json name -q .name)-stage.surge.sh

# Deploy to surge.sh (production)
deploy-prod:
    npx surge dist $(gh repo view --json name -q .name).surge.sh
