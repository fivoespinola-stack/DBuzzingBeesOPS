// Generator for spreadsheetData.ts
import fs from 'fs';
import path from 'path';

// Cleaners mapped from the spreadsheet
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

console.log('Cleaner count:', cleaners.length);
