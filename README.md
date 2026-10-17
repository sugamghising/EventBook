# EventBook

Event booking 

## Auth

Stateless JWTs (short expiry). There is deliberately **no logout endpoint** — a stateless token can't be revoked before it expires, so the client just discards it.


