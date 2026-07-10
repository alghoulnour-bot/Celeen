// Each entry is a PARTY (household) seated at one table, with its members.
// Any member can look up the party by typing their own name, then mark who is
// and isn't coming. Edit here, or use the admin editor.
//
// This only seeds a database that has no parties yet — an existing guest list is
// never overwritten. See docs/guest-list-setup.md.
module.exports = [
  { table: 12, members: ['Zeina', 'Sedra', 'Rawan', 'Amo', 'Dania'] },
  { table: 12, members: ['Besma Khadim', 'Ahmad'] },
];
