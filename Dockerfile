FROM public.ecr.aws/e1h7x4a2/plow-cloud-agents:base-ddbaa6bc0f9e071d9411777b91590e755e367d84@sha256:5b0ebf5e33514b09f0f22f1c14424a19b4eb3fc21adfaeb260002f76d362478c
USER root
ARG PLOW_HOURS_REVISION
LABEL org.opencontainers.image.source="https://github.com/EnzoTironi/plow-hours" org.opencontainers.image.revision=$PLOW_HOURS_REVISION co.plow.probe="/opt/plow/probe"
COPY plugin /opt/plow/hours-source/plugin
COPY install.mjs probe.mjs backup.mjs /opt/plow/hours-source/
COPY addon /opt/ours/plugin
COPY boot/ours-config.ts /opt/plow/boot/ours-config.ts
RUN cd /opt/plow && npm install --save-exact --omit=dev --omit=peer --omit=optional --ignore-scripts --no-audit --no-fund zod@4.6.5 && node /opt/plow/hours-source/install.mjs
COPY AGENTS.md /opt/plow/hours-source/AGENTS.md
RUN cp /opt/plow/hours-source/AGENTS.md /opt/plow/prompt/AGENTS.md
COPY skill /opt/plow/skills/contractor-hours
ENV PLOW_HOURS=1 PLOW_THREAD_TRUST=untrusted AGENT_ID=ours AGENT_NAME="Ours" AGENT_BLURB="Track contractor hours in iMessage. Keep the timesheet and invoice paperwork in one place."
COPY boot/preboot.ts /opt/plow/boot/ours-preboot.ts
CMD ["node", "/opt/plow/boot/ours-preboot.ts"]
USER node
