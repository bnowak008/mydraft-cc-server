FROM oven/bun:latest

# get git
RUN apt-get update && apt-get install -y git

WORKDIR /mydraft

# setup the server
COPY . .

RUN bun install
RUN echo -e "\nVITE_SERVER_URL=/api" >> ./.env
RUN bun run build
RUN cp ./.env ./dist/

# setup react app
RUN cd ./dist/ && git clone https://github.com/mydraft-cc/ui.git

RUN cd ./dist/ui && echo "VITE_SERVER_URL=/api" > ./.env
RUN cd ./dist/ui && rm -rf ./package-lock.json
RUN cd ./dist/ui && bun install
RUN cd ./dist/ui && bun run build

RUN mkdir -p ./localFileStore
RUN chmod -R a+rw ./localFileStore

# Use non-root user for security
USER bun
EXPOSE 8001/tcp

CMD ["bun", "./dist/index.js"]