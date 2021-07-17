import * as prometheus from 'prom-client';

prometheus.collectDefaultMetrics();

export const currentConnectionsMetric = new prometheus.Gauge({
    name: 'skriber_connections_current',
    help: 'Count of currently connected clients',
});

export const totalConnectionsMetric = new prometheus.Counter({
    name: 'skriber_connections_total',
    help: 'Total count of successful connection requests',
});

export const totalDisconnectsMetric = new prometheus.Counter({
    name: 'skriber_disconnections_total',
    help: 'Total count of disconnections',
});

export const totalBytesReceivedMetric = new prometheus.Counter({
    name: 'skriber_receive_bytes_total',
    help: 'Total count of received bytes',
});

export const totalBytesTransmittedMetric = new prometheus.Counter({
    name: 'skriber_transmit_bytes_total',
    help: 'Total count of transmitted bytes',
});

export const totalEventsEmittedMetric = new prometheus.Counter({
    name: 'skriber_event_emit_total',
    help: 'Total count of emitted events'
});

export async function getMetrics(): Promise<string> {
    return await prometheus.register.metrics();
}