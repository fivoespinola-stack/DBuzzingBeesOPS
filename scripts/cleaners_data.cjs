const fs = require('fs');
const path = require('path');

const cleaners = [
  { id: 'cleaner-lanie', name: 'Lanie', phone: '0412 884 921', email: 'lanie@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 45.00, status: 'active', notes: 'Lead Cleaning Supervisor & Senior Residential Specialist' },
  { id: 'cleaner-ivy', name: 'Ivy', phone: '0421 993 104', email: 'ivy@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 40.00, status: 'active', notes: 'Lead Cleaner & NDIS Specialist' },
  { id: 'cleaner-glaiza', name: 'Glaiza', phone: '0434 551 882', email: 'glaiza@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 35.00, status: 'active', notes: 'Commercial and bond clean specialist' },
  { id: 'cleaner-marlyn', name: 'Marlyn', phone: '0445 120 739', email: 'marlyn@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 35.00, status: 'active', notes: 'Detail cleaning & high-end homes' },
  { id: 'cleaner-zita', name: 'Zita', phone: '0452 388 901', email: 'zita@dbuzzingbees.com.au', hourlyRate: 29.00, specialTaskPayPerWeek: 30.00, status: 'active', notes: 'Quality assurance & residential' },
  { id: 'cleaner-grace', name: 'Grace', phone: '0461 440 219', email: 'grace@dbuzzingbees.com.au', hourlyRate: 29.00, specialTaskPayPerWeek: 30.00, status: 'active', notes: 'Residential standard & move-out' },
  { id: 'cleaner-bj', name: 'BJ', phone: '0478 301 928', email: 'bj@dbuzzingbees.com.au', hourlyRate: 29.50, specialTaskPayPerWeek: 30.00, status: 'active', notes: 'Window & floor scrubbing specialist' },
  { id: 'cleaner-evelyn', name: 'Evelyn', phone: '0482 119 403', email: 'evelyn@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 35.00, status: 'active', notes: 'Senior team lead across Byford & Wellard' },
  { id: 'cleaner-ronald', name: 'Ronald', phone: '0491 802 774', email: 'ronald@dbuzzingbees.com.au', hourlyRate: 31.00, specialTaskPayPerWeek: 40.00, status: 'active', notes: 'Commercial extraction & evening cleans' },
  { id: 'cleaner-lorie', name: 'Lorie', phone: '0415 628 394', email: 'lorie@dbuzzingbees.com.au', hourlyRate: 28.50, specialTaskPayPerWeek: 25.00, status: 'active', notes: 'Routine maintenance cleans' },
  { id: 'cleaner-bea', name: 'Bea', phone: '0427 483 910', email: 'bea@dbuzzingbees.com.au', hourlyRate: 29.00, specialTaskPayPerWeek: 25.00, status: 'active', notes: 'Serpentine & Byford sites' },
  { id: 'cleaner-inessa', name: 'Inessa', phone: '0439 501 827', email: 'inessa@dbuzzingbees.com.au', hourlyRate: 29.00, specialTaskPayPerWeek: 25.00, status: 'active', notes: 'Residential care specialist' },
  { id: 'cleaner-beverly', name: 'Beverly', phone: '0448 932 105', email: 'beverly@dbuzzingbees.com.au', hourlyRate: 29.50, specialTaskPayPerWeek: 30.00, status: 'active', notes: 'Standard & deep clean' },
  { id: 'cleaner-aubrie', name: 'Aubrie', phone: '0459 204 883', email: 'aubrie@dbuzzingbees.com.au', hourlyRate: 28.50, specialTaskPayPerWeek: 20.00, status: 'active', notes: 'Team support cleaner' },
  { id: 'cleaner-vince', name: 'Vince', phone: '0468 772 190', email: 'vince@dbuzzingbees.com.au', hourlyRate: 30.00, specialTaskPayPerWeek: 35.00, status: 'active', notes: 'Commercial facilities & deep bond' },
  { id: 'cleaner-mitchell', name: 'Mitchell', phone: '0471 639 281', email: 'mitchell@dbuzzingbees.com.au', hourlyRate: 29.00, specialTaskPayPerWeek: 25.00, status: 'active', notes: 'General residential maintenance' },
  { id: 'cleaner-rhenna', name: 'Rhenna', phone: '0484 550 392', email: 'rhenna@dbuzzingbees.com.au', hourlyRate: 28.50, specialTaskPayPerWeek: 20.00, status: 'active', notes: 'Byford residential cleaner' },
  { id: 'cleaner-ethel', name: 'Ethel', phone: '0493 218 704', email: 'ethel@dbuzzingbees.com.au', hourlyRate: 29.50, specialTaskPayPerWeek: 30.00, status: 'active', notes: 'Experienced routine residential cleaner' },
];

const dataCorrectionsLog = [
  {
    invoice: 'INV-1584',
    client: 'Dominic (BBA0041)',
    date: '2026-09-14',
    field: 'End Time',
    original: '######## (Excel column width overflow error)',
    corrected: '11:30 AM',
    reason: 'Derived from Start Time 09:30 AM + Fix Hours 2.0.'
  },
  {
    invoice: 'INV-1608 / Special',
    client: 'Linda (BBA0019) / Maram (BBA0088)',
    date: '2026-10-08 / 2026-10-21',
    field: 'Rate',
    original: '2.5$ for spa (text in numeric column)',
    corrected: '$55.00/hr (with note in remarks)',
    reason: 'Text note mistakenly typed into Rate column; preserved note in task remarks.'
  },
  {
    invoice: 'Multiple',
    client: 'Various Cleaners',
    date: 'Multiple dates',
    field: 'Cleaner Names & Aliases',
    original: 'Glaza, Etihil, Etihl, Mitch, Inssa, Mars, Bj, B\'j, Zely',
    corrected: 'Glaiza, Ethel, Mitchell, Inessa, Marlyn, BJ, Zita',
    reason: 'Standardized cleaner aliases and typos to match consistent staff IDs across payroll and scheduling.'
  },
  {
    invoice: 'Multiple',
    client: 'Various Addresses',
    date: 'April - October 2026',
    field: 'Addresses & Client Labels',
    original: '18 Ungarra(NDIS, 100 Richard(NDIS, Medina,Kwinana, First Natio, Kare/Horn',
    corrected: '18 Ungarra Rd (NDIS), 100 Richardson St (NDIS), Medina, Kwinana WA, First National Real Estate, Karen / Horn',
    reason: 'Cleaned truncated text and unclosed parentheses for professional client communications.'
  }
];

module.exports = { cleaners, dataCorrectionsLog };
