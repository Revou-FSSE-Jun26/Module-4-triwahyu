# Permission Matrix

Owner rule: `guidelines/backend.md` BE-08. Roles are per board (`board_members.role`): `admin` or `member`.
The user who creates a board becomes its first `admin`. A board must always keep at least one admin.

| Action                                              | Anonymous |   Non-member   |          Member          |     Admin      |
| --------------------------------------------------- | :-------: | :------------: | :----------------------: | :------------: |
| Register, login                                     |    yes    |      yes       |           yes            |      yes       |
| Read / update own profile                           | no (401)  |      yes       |           yes            |      yes       |
| Create a board                                      | no (401)  |      yes       |           yes            |      yes       |
| List own boards                                     | no (401)  | yes (own only) |           yes            |      yes       |
| Read a board, its columns, cards, comments, members | no (401)  |    no (403)    |           yes            |      yes       |
| Create, rename, reorder columns                     | no (401)  |    no (403)    |           yes            |      yes       |
| Delete a column                                     | no (401)  |    no (403)    |         no (403)         |      yes       |
| Create, edit, move cards; assign cards              | no (401)  |    no (403)    |           yes            |      yes       |
| Delete a card                                       | no (401)  |    no (403)    | only a card they created |      yes       |
| Add a comment, list comments                        | no (401)  |    no (403)    |           yes            |      yes       |
| Edit or delete a comment                            | no (401)  |    no (403)    |      **owner only**      | **owner only** |
| Rename or delete the board                          | no (401)  |    no (403)    |         no (403)         |      yes       |
| Add, change role of, remove members                 | no (401)  |    no (403)    |         no (403)         |      yes       |
| Read board analytics                                | no (401)  |    no (403)    |         no (403)         |      yes       |
| Read / mark read own notifications                  | no (401)  | yes (own only) |           yes            |      yes       |

## Notes

- A resource that does not exist, or is soft-deleted, is `404` for everyone. A real resource the caller may not touch is `403`.
- Another user's notification is `404`, so notification IDs are never confirmed to exist.
- Comment edit and delete are owner-only for admins too. This is the assignment's rule.
- Assignees must be members of the card's board. Removing a member unassigns their cards on that board.
