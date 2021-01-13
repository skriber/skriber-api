# Structure

## Channels
Channel names are strings, for example: `users.103934.orders`. A channels name may contain **letters**, **numbers** and the following characters: `. _ -`.  This may be a channel, to notify a user with the id `103934` about order updates. Of course this channel should be private and only subscribeable to the actual user itself.

A private channel is suffixed with `.private`, so the channel name would be `users.103934.orders.private`. When a client socket tries to connect to a private channel, the api calls a webhook on the application server asking for channel authorization for a given socket. When the socket is authorized, it will be able to subscribe, otherwise it'll receive an error message.

All channels are automatically prefixed with the applications uuid. It'll look like this: `applicationUUID:channelname()`.

### Private Channels
Private channels are pre-authenticated, meaning a client needs to be authenticated to subscribe to the channel. 