# API contracts

## Common contract

`API-COM-001`: Base `/api/v1`; JSON; OpenAPI checked in/generated deterministically và contract-tested.  
`API-COM-002`: Auth `Bearer` cho Customer/Admin; service calls dùng trusted service identity; deny-by-default.  
`API-COM-003`: Error `{ "error": { "code": string, "message": string, "requestId": string, "details"?: object } }`; không stack/internal URL/secret.  
`API-COM-004`: Validation reject unknown/invalid fields; UUID/date/enum/length/range explicit.  
`API-COM-005`: Collection pagination bounded (`limit<=100`), stable sort + cursor/page contract; filter/sort allowlist.  
`API-COM-006`: Breaking response/request change cần new version/CCR; additive optional field allowed sau consumer review.  
`API-IDN-001`: Mutating retryable endpoint khai báo `Idempotency-Key`; same key+same payload returns same logical outcome, same key+different payload `409`.

## Endpoint inventory

Mỗi row kế thừa common error/validation/security/compatibility/OpenAPI contract. Request/response schema là tên component bắt buộc trong OpenAPI; detailed fields được thiết kế/review trong ticket trước implementation.

| Contract ID | Actor | Method path | Authz | Request → response | Status/failure | Idempotency |
|---|---|---|---|---|---|---|
| API-AUTH-001 | Guest | `POST /api/v1/auth/register` | public/rate limited | `RegisterRequest → AuthSessionResponse` | 201; 400/409/429 | required |
| API-AUTH-002 | Guest | `POST /api/v1/auth/login` | public/rate limited | `LoginRequest → AuthSessionResponse` | 200; generic 401/429 | no retry guarantee |
| API-AUTH-003 | Customer | `POST /api/v1/auth/refresh` | valid refresh family | `RefreshRequest → AuthSessionResponse` | 200; 401 replay/expired | token rotation key |
| API-AUTH-004 | Customer | `POST /api/v1/auth/logout` | session owner | `LogoutRequest → Empty` | 204; 401 | replay safe |
| API-AUTH-005 | Customer | `GET /api/v1/me` | self | none → `ProfileResponse` | 200; 401 | safe |
| API-CAT-001 | Guest | `GET /api/v1/movies` | published only | filters/page → `MoviePage` | 200; 400 | safe |
| API-CAT-002 | Admin | `POST /api/v1/admin/movies` | Admin | `MovieWrite → MovieResponse` | 201; 400/409 | required |
| API-CAT-003 | Admin | `PATCH /api/v1/admin/movies/{id}` | Admin | `MoviePatch → MovieResponse` | 200; 400/404/409 | required |
| API-CAT-004 | Guest | `GET /api/v1/cinemas/{id}/showtimes` | published only | date/page → `ShowtimePage` | 200; 400/404 | safe |
| API-CAT-005 | Admin | `POST /api/v1/admin/cinemas` | Admin | `CinemaWrite → CinemaResponse` | 201; 400/409 | required |
| API-CAT-006 | Admin | `POST /api/v1/admin/screens/{id}/showtimes` | Admin | `ShowtimeWrite → ShowtimeResponse` | 201; 400/404/409 overlap | required |
| API-CAT-007 | Admin | `POST /api/v1/admin/showtimes/{id}/publish` | Admin | none → `ShowtimeResponse` | 200; 404/409 | required |
| API-CAT-008 | Admin | `POST /api/v1/admin/cinemas/{id}/screens` | Admin | `ScreenWrite → ScreenResponse` | 201; 400/404/409 | required |
| API-CAT-009 | Admin | `POST /api/v1/admin/screens/{id}/seats` | Admin | `SeatLayoutWrite → SeatLayoutResponse` | 201; 400/404/409 duplicate label | required |
| API-BKG-001 | Customer | `POST /api/v1/holds` | authenticated actor | `HoldRequest → HoldResponse` | 201; 400/401/404/409 | required |
| API-BKG-002 | Customer | `POST /api/v1/bookings` | hold owner | `BookingRequest → BookingResponse` | 201; 400/401/404/409 | required |
| API-BKG-003 | Customer | `GET /api/v1/bookings/{id}` | owner/Admin | none → `BookingResponse` | 200; 401/403/404 | safe |
| API-BKG-004 | Guest | `GET /api/v1/showtimes/{id}/seats` | published only | none → `ShowtimeSeatMapResponse` | 200; 400/404 | safe |
| API-BKG-005 | Customer | `DELETE /api/v1/holds/{id}` | hold owner | none → `Empty` | 204; 401/403/404/409 | replay safe |
| API-PAY-001 | Customer | `POST /api/v1/bookings/{id}/payments` | booking owner | `PaymentStart → PaymentResponse` | 202; 400/401/404/409/503 | required |
| API-PAY-002 | Provider | `POST /api/v1/webhooks/payments/{provider}` | verified signature | raw provider body → ack | 200; 400/401 | provider event ID |
| API-TKT-001 | Customer | `GET /api/v1/bookings/{id}/ticket` | owner/Admin | none → `TicketResponse` | 200; 401/403/404/409 | safe |

Security/failure specifics: auth response never returns password/hash; Catalog admin and public DTOs separated; booking conflicts do not expose other actor; webhook verifies raw body/timestamp/signature/reference/amount/currency before effect. Seat map (`API-BKG-004`) phục vụ từ Booking-owned snapshot/seat state, không phải Catalog; response chỉ expose seat identity/state/price, không expose actor khác. Release hold (`API-BKG-005`) trên hold đã terminal là no-op hoặc `409` theo reviewed design ticket.
