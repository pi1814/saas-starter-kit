ARG NODEJS_IMAGE=node:20.18.1-alpine3.19
FROM --platform=$BUILDPLATFORM $NODEJS_IMAGE AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json  ./
COPY prisma ./prisma
RUN npm install
RUN npm rebuild --arch=x64 --platform=linux --libc=musl sharp

# Generate prisma client for production
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_TERMS_URL=https://boxyhq.com/terms.html
ENV NEXT_PUBLIC_PRIVACY_URL=https://boxyhq.com/privacy.html
ENV NEXT_PUBLIC_DARK_MODE=false
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LfsAbMoAAAAAIl_yao0rxsz1IWk0UaYp2ofpNiy
ENV NEXT_PUBLIC_MIXPANEL_TOKEN=64202bc81e38778793e3959c16aa9704
ENV NEXT_PUBLIC_SENTRY_DSN="https://5c6ef634c4dbd73a43a5fbb077b67832@o4506115874947072.ingest.sentry.io/4506225169072128"
ENV NEXT_PUBLIC_SUPPORT_URL="mailto:support@boxyhq.com"

RUN npm run build-ci


# Production image, copy all the files and run next
FROM $NODEJS_IMAGE AS runner
WORKDIR /app

ENV NODE_OPTIONS="--max-http-header-size=81920 --dns-result-order=ipv4first"


ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs


COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/sync-stripe.js ./sync-stripe.js
COPY --from=builder /app/delete-team.js ./delete-team.js

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN npm i -g json
# Print the value of devDependencies.prisma
RUN echo "Prisma Version: $(cat ./package.json| json devDependencies.prisma)"

RUN npm i -g prisma@$(cat ./package.json| json devDependencies.prisma)

RUN apk add --no-cache postgresql-client

ENV PORT=4002

USER nextjs

EXPOSE 4002

CMD ["node", "server.js"]