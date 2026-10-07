# @sofa/web

## 0.3.0

### Minor Changes

- [`cb5e0c1`](https://github.com/jakejarvis/sofa/commit/cb5e0c19e7efbb9d3a6e3e0a933e33ad203bb01d) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Remove a single watch from your history, or log a watch on a specific date from a title's page

- [`b63fbce`](https://github.com/jakejarvis/sofa/commit/b63fbce60da8383c3e5e403966d8ed72572f42a5) Thanks [@souocare](https://github.com/souocare)! - Find titles by IMDb ID: searching for an ID like `tt0133093` returns that movie or show

- [#52](https://github.com/jakejarvis/sofa/pull/52) [`553fe98`](https://github.com/jakejarvis/sofa/commit/553fe98013a7d09b4e499d60f238ba1ece6daefc) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Add a "Mark Unwatched" button for movies you've already watched (the `M` shortcut toggles it too)

- [`04bcb66`](https://github.com/jakejarvis/sofa/commit/04bcb66436dc14c3630d29a1c1357dc1ec13747a) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Mark episodes watched straight from Continue Watching and Upcoming

- [`e625f31`](https://github.com/jakejarvis/sofa/commit/e625f319a20ca51ed7b5cdae331b8b88b5d0c164) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Add a "Recently aired" view to Upcoming that lists aired episodes you haven't watched yet

- [`b292fe3`](https://github.com/jakejarvis/sofa/commit/b292fe37abbd73cee98c918edb915018989c657c) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Add a watch history page listing every movie and episode you've watched, and a "Last watched" sort for the library

### Patch Changes

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Fix a batch of web app issues

  - Show translated error messages instead of raw server errors, and fix the "Tomorrow" and "Next week" labels
  - Refresh lists and counts after you change a title, and make Retry buttons actually retry
  - Clear cached data when you sign out or switch accounts
  - Keep infinite lists from dropping their first page, and load more titles in Explore rows
  - Ignore title keyboard shortcuts while a dialog or menu is open
  - Explain why a password change failed

- Updated dependencies []:
  - @sofa/api@0.3.0
  - @sofa/i18n@0.3.0
