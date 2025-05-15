FROM ubuntu:24.04

COPY --chmod=755 ./install-requirements.sh /scripts/
RUN /scripts/install-requirements.sh
COPY --chmod=755 ./make.sh /scripts/
ENTRYPOINT ["/scripts/make.sh"]
