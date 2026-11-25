# Analytics: Tasks

## Backend

- [x] **T-ANL-1** `GET /api/boards/<id>/analytics`: cards per column via an outer join. _(REQ-ANL-1)_ → `backend/app/blueprints/analytics/{routes,service,schema}.py`, `tests/test_analytics.py`
- [x] **T-ANL-2** Completed this week with an injectable clock. _(REQ-ANL-2)_ → `analytics/service.py`, `test_cards_completed_in_earlier_weeks_are_not_counted`
- [x] **T-ANL-3** Member activity from joined, grouped queries. _(REQ-ANL-3)_ → `analytics/service.py`
- [x] **T-ANL-4** Admin-only access. _(REQ-ANL-4)_ → `analytics/service.py`, `test_analytics_is_admin_only`

## Frontend

- [x] **T-ANL-5** Analytics dialog for admins. _(REQ-ANL-5)_ → `frontend/src/components/board/AnalyticsModal.tsx`, `BoardView.tsx`
