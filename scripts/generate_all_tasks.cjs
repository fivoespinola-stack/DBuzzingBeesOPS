const fs = require('fs');
const path = require('path');
const { cleaners, dataCorrectionsLog } = require('./cleaners_data.cjs');

// Compact representation of sheet rows:
// [invoiceNo, fixHour, clientNo, name, schedule, dateStr, startTime, endTime, hours, rate, payTerm, address, remark, cleanersStr]
const rawRows = [
  // October 2026
  ["INV-1634", 2.0, "BBA0098", "Adam", "fortnightly", "2026-10-23", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Road (NDIS), Wellard", "Lanie", "Glaiza, Ivy"],
  ["paid 24/10", 4.0, "BBA0108", "Olivia", "fortnightly", "2026-10-23", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Glaiza, Ivy"],
  ["INV-1635", 1.33, "BBA0094", "Hindia", "weekly", "2026-10-23", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Ivy"],
  ["INV-1628", 1.5, "BBA0057", "Dee", "weekly", "2026-10-23", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Ivy"],
  ["INV-1636", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-10-23", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Ivy"],
  ["", 6.0, "BBA0047", "Rhianna", "flexible", "2026-10-23", "11:00", "13:00", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Glaiza"],
  ["", 5.0, "BBA0010", "Serpentine", "weekly", "2026-10-22", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["", 4.0, "BBA0114", "Sarah/Paul", "one-off", "2026-10-22", "09:30", "11:30", 2.0, 60.0, "Cash", "28 Rockport Ridge, Meadow Springs", "Glaiza", "Ivy"],
  ["", 5.0, "BBA0036", "Ziggy", "weekly", "2026-10-22", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Ivy"],
  ["", 1.5, "BBA0027", "SiM", "weekly", "2026-10-22", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Ivy"],
  ["", 4.0, "BBA0016", "Karen / Horn", "weekly", "2026-10-21", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Lyn", "Lanie, Marlyn"],
  ["paid 23/10", 2.0, "BBA0088", "Maram", "fortnightly", "2026-10-21", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lyn", "Lanie, Marlyn"],
  ["", 10.5, "BBA0028", "Jamie", "flexible", "2026-10-21", "13:30", "15:00", 1.5, 55.0, "Invoice", "8 Caldow Way, Medina", "Lyn", "Lanie, Marlyn"],
  ["", 3.5, "BBA0019", "Linda", "fortnightly", "2026-10-21", "09:30", "11:30", 2.0, 55.0, "Invoice", "8 Jersey Rd, Oakford", "Special clean / spa note in sheet. Lanie", "Glaiza, Ivy"],
  ["", 2.0, "BBA0058", "Athena", "fortnightly", "2026-10-21", "12:00", "14:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Lanie", "Glaiza, Ivy"],
  ["INV-1629", 1.67, "BBA0034", "Dee", "fortnightly", "2026-10-20", "09:45", "11:25", 1.67, 58.03, "Invoice", "16 Hardey Rd (NDIS), Glen Forrest", "Zita", "Ivy"],
  ["", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-20", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Zita", "Ivy"],
  ["INV-1627", 2.0, "BBA0029", "Dr. Jen", "fortnightly", "2026-10-20", "10:45", "12:45", 2.0, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Zita", "Ivy"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-20", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Zita", "Ivy"],
  ["INV-1626", 2.0, "BBA0027", "SiM", "weekly", "2026-10-20", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "Zita", "Ivy"],
  ["", 2.0, "BBA0037", "Lorna", "weekly", "2026-10-20", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lanie", "Glaiza"],
  ["", 2.0, "BBA0047", "Rhianna", "flexible", "2026-10-20", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Glaiza"],
  ["", 2.0, "BBA0049", "Jacqui", "fortnightly", "2026-10-20", "09:30", "11:30", 2.0, 60.0, "Invoice", "100 Richardson St (NDIS), Serpentine", "Lyn", "Marlyn"],
  ["INV-1630", 2.0, "BBA0006", "Sylvana", "fortnightly", "2026-10-20", "11:45", "13:45", 2.0, 60.0, "Cash", "1089 Forrest St, Peppermint Grove Beach", "Lyn", "Marlyn"],
  ["", 1.5, "BBA0073", "James", "fortnightly", "2026-10-20", "09:30", "11:00", 1.5, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Lyn", "Lanie"],
  ["", 2.0, "BBA0087", "Pradeepval", "flexible", "2026-10-20", "11:30", "13:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lyn", "Lanie"],
  ["INV-1631", 2.0, "BBA0041", "Deb", "fortnightly", "2026-10-19", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Zita", "Ivy"],
  ["INV-1622", 1.5, "BBA0042", "Robyn", "fortnightly", "2026-10-19", "09:15", "10:45", 1.5, 58.03, "Cash", "19 Cappuccino Dr, Baldivis", "Zita", "Ivy"],
  ["INV-1623", 1.5, "BBA0096", "Laura Scott", "fortnightly", "2026-10-19", "13:30", "15:00", 1.5, 55.0, "Cash", "25 Bellingham Parade, Wellard", "Zita", "Ivy"],
  ["", 2.0, "BBA0103", "First National", "flexible", "2026-10-19", "09:30", "11:30", 2.0, 60.0, "Invoice", "18 Olearia St, Baldivis", "Lanie", "Marlyn, Grace"],
  ["INV-1632", 2.0, "BBA0109", "Cindy", "fortnightly", "2026-10-19", "11:45", "13:45", 2.0, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Marlyn, Grace"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-19", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Marlyn, Grace"],
  ["INV-1624", 2.5, "BBA0005", "Natasha", "fortnightly", "2026-10-16", "09:30", "12:00", 2.5, 60.0, "Cash", "508 Hills Rd, North Dandalup", "Lanie", "Glaiza"],
  ["paid 16/10", 1.5, "BBA0043", "Sally", "fortnightly", "2026-10-16", "12:30", "14:00", 1.5, 55.0, "Cash", "44 Somerford Promenade, Wellard", "Lanie", "Glaiza"],
  ["INV-1625", 2.0, "BBA0041", "Dominic", "one-off", "2026-10-16", "09:30", "11:30", 2.0, 60.0, "Cash", "158 Sapphire Chase, Wellard", "Glaiza", "Ivy"],
  ["", 2.0, "BBA0041", "Deb", "fortnightly", "2026-10-16", "11:45", "13:45", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Glaiza", "Ivy"],
  ["paid 17/10", 1.5, "BBA0096", "Laura Scott", "fortnightly", "2026-10-16", "14:00", "15:30", 1.5, 55.0, "Cash", "25 Bellingham Parade, Wellard", "Glaiza", "Ivy"],
  ["paid 19/10", 2.0, "BBA0097", "Jacqui", "fortnightly", "2026-10-16", "09:30", "11:30", 2.0, 55.0, "Cash", "29 Portman Parade, Byford", "Lyn", "Marlyn, Grace"],
  ["paid 20/10", 2.0, "BBA0077", "Sylvana", "fortnightly", "2026-10-16", "12:00", "14:00", 2.0, 60.0, "Cash", "2 Bischoff Rd, Hammond Park", "Lyn", "Marlyn, Grace"],
  ["paid 23/10", 2.0, "BBA0006", "Sylvana", "fortnightly", "2026-10-15", "11:45", "13:45", 2.0, 60.0, "Cash", "1089 Forrest St, Peppermint Grove Beach", "Mars", "Grace"],
  ["paid 15/10", 2.0, "BBA0088", "Maram", "fortnightly", "2026-10-15", "09:15", "11:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lanie", "Glaiza"],
  ["", 2.0, "BBA0047", "Rhianna", "flexible", "2026-10-15", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Glaiza"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-15", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["INV-1620", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-15", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Ivy"],
  ["INV-1619", 1.5, "BBA0027", "SiM", "weekly", "2026-10-15", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Ivy"],
  ["paid 16/10", 2.0, "BBA0029", "Dr. Jen", "fortnightly", "2026-10-13", "10:45", "12:45", 2.0, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Zita", "Ivy"],
  ["", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-13", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Zita", "Ivy"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-13", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Zita", "Ivy"],
  ["", 2.0, "BBA0027", "SiM", "weekly", "2026-10-13", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "Zita", "Ivy"],
  ["", 2.0, "BBA0058", "Athena", "fortnightly", "2026-10-13", "12:00", "14:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "BJ", "Marlyn"],
  ["", 1.5, "BBA0073", "James", "fortnightly", "2026-10-13", "09:30", "11:00", 1.5, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "BJ", "Marlyn"],
  ["paid 14/10", 2.0, "BBA0087", "Pradeepval", "flexible", "2026-10-13", "11:30", "13:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "BJ", "Marlyn"],
  ["INV-1616", 1.33, "BBA0094", "Hindia", "weekly", "2026-10-12", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Zita", "Ivy"],
  ["INV-1617", 1.5, "BBA0057", "Dee", "weekly", "2026-10-12", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Zita", "Ivy"],
  ["INV-1618", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-12", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Zita", "Ivy"],
  ["INV-1614", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-10-09", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Glaiza"],
  ["INV-1615", 2.0, "BBA0098", "Adam", "fortnightly", "2026-10-09", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Glaiza"],
  ["INV-1611", 1.33, "BBA0094", "Hindia", "weekly", "2026-10-09", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Glaiza"],
  ["INV-1612", 1.5, "BBA0057", "Dee", "weekly", "2026-10-09", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Glaiza"],
  ["INV-1613", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-10-09", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Glaiza"],
  ["INV-1608", 2.5, "BBA0035", "Kate", "fortnightly", "2026-10-09", "09:30", "12:00", 2.5, 60.0, "Invoice", "51 Koonawba Valley Cl, Byford", "Mars", "Ivy"],
  ["INV-1609", 2.0, "BBA0033", "Linda", "fortnightly", "2026-10-09", "12:30", "14:30", 2.0, 60.0, "Invoice", "32 Alston Way, Byford", "Mars", "Ivy"],
  ["INV-1610", 2.0, "BBA0058", "Athena", "fortnightly", "2026-10-09", "15:00", "17:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Mars", "Ivy"],
  ["paid 13/10", 2.0, "BBA0088", "Maram", "fortnightly", "2026-10-08", "12:15", "14:15", 2.0, 60.0, "Invoice", "8 Jersey Rd, Oakford", "Mars - Special clean / spa note in sheet fixed to 60.00", "Lanie, Ivy"],
  ["paid 09/10", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-10-08", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Mars", "Lanie, Ivy"],
  ["paid 10/10", 2.0, "BBA0047", "Rhianna", "flexible", "2026-10-08", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Glaiza", "Glaiza"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-08", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["paid 09/10", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-08", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Glaiza"],
  ["INV-1607", 1.5, "BBA0027", "SiM", "weekly", "2026-10-08", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["INV-1606", 1.67, "BBA0034", "Dee", "fortnightly", "2026-10-06", "09:45", "11:25", 1.67, 58.03, "Invoice", "16 Hardey Rd (NDIS), Glen Forrest", "Lanie", "Marlyn, Ivy"],
  ["paid 07/10", 2.0, "BBA0049", "Jacqui", "fortnightly", "2026-10-06", "09:30", "11:30", 2.0, 60.0, "Invoice", "100 Richardson St (NDIS), Serpentine", "Lanie", "Marlyn, Ivy"],
  ["paid 06/10", 2.0, "BBA0033", "Linda", "fortnightly", "2026-10-06", "11:30", "13:30", 2.0, 60.0, "Invoice", "32 Alston Way, Byford", "Lanie", "Marlyn, Ivy"],
  ["paid 07/10", 2.0, "BBA0006", "Sylvana", "fortnightly", "2026-10-06", "11:45", "13:45", 2.0, 60.0, "Cash", "1089 Forrest St, Peppermint Grove Beach", "Lanie", "Marlyn, Ivy"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-06", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["paid 06/10", 1.67, "BBA0042", "Robyn", "one-off", "2026-10-05", "09:15", "10:55", 1.67, 58.03, "Cash", "19 Cappuccino Dr, Baldivis", "Lanie", "Ivy"],
  ["INV-1605", 2.0, "BBA0041", "Deb", "fortnightly", "2026-10-05", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Lanie", "Ivy"],
  ["INV-1602", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-05", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Lanie", "Marlyn"],
  ["INV-1603", 2.0, "BBA0037", "Lorna", "weekly", "2026-10-05", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lanie", "Marlyn"],
  ["INV-1604", 2.0, "BBA0109", "Cindy", "fortnightly", "2026-10-05", "11:45", "13:45", 2.0, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Marlyn"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-05", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["paid 05/10", 1.33, "BBA0094", "Hindia", "weekly", "2026-10-02", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Ivy"],
  ["INV-1600", 1.5, "BBA0057", "Dee", "weekly", "2026-10-02", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Ivy"],
  ["INV-1601", 2.0, "BBA0027", "SiM", "weekly", "2026-10-02", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "BJ", "Bea"],
  ["paid 02/10", 1.5, "BBA0010", "Serpentine", "weekly", "2026-10-02", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "BJ", "Bea"],
  ["INV-1598", 2.5, "BBA0050", "Cindy", "once-a-month", "2026-10-01", "11:15", "13:45", 2.5, 60.0, "Cash", "3 Morton Rd, Wellard", "Lanie", "Ivy"],
  ["INV-1599", 2.0, "BBA0036", "Ziggy", "weekly", "2026-10-01", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Lanie", "Ivy"],
  ["paid 02/10", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-10-01", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Glaiza", "Glaiza"],
  ["INV-1597", 1.5, "BBA0096", "Laura Scott", "fortnightly", "2026-10-01", "13:30", "15:00", 1.5, 55.0, "Cash", "25 Bellingham Parade, Wellard", "Glaiza", "Glaiza"],
  ["paid 01/10", 2.0, "BBA0088", "Maram", "fortnightly", "2026-10-01", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Glaiza", "Glaiza"],
  ["", 2.0, "BBA0047", "Rhianna", "flexible", "2026-10-01", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Glaiza", "Glaiza"],
  ["INV-1596", 2.0, "BBA0103", "First National", "end-of-month", "2026-10-01", "09:30", "11:30", 2.0, 60.0, "Invoice", "18 Olearia St, Baldivis", "Lanie", "Glaiza"],

  // September 2026
  ["paid 01/10", 2.0, "BBA0041", "Dominic", "one-off", "2026-09-30", "09:30", "11:30", 2.0, 60.0, "Cash", "158 Sapphire Chase, Wellard", "Glaiza", "Glaiza"],
  ["paid 30/09", 1.5, "BBA0043", "Sally", "fortnightly", "2026-09-30", "12:30", "14:00", 1.5, 55.0, "Cash", "44 Somerford Promenade, Wellard", "Glaiza", "Glaiza"],
  ["INV-1577", 2.5, "BBA0005", "Natasha", "fortnightly", "2026-09-29", "09:30", "12:00", 2.5, 60.0, "Cash", "508 Hills Rd, North Dandalup", "Lanie", "Marlyn"],
  ["paid 29/09", 2.0, "BBA0097", "Jacqui", "fortnightly", "2026-09-29", "09:30", "11:30", 2.0, 55.0, "Cash", "29 Portman Parade, Byford", "Lanie", "Marlyn"],
  ["paid 29/09", 2.0, "BBA0029", "Dr. Jen", "fortnightly", "2026-09-29", "10:45", "12:45", 2.0, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Lanie", "Marlyn"],
  ["paid 29/09", 1.5, "BBA0073", "James", "fortnightly", "2026-09-29", "09:30", "11:00", 1.5, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Lanie", "Marlyn"],
  ["paid 29/09", 2.0, "BBA0077", "Sylvana", "fortnightly", "2026-09-29", "12:00", "14:00", 2.0, 60.0, "Cash", "2 Bischoff Rd, Hammond Park", "Lanie", "Marlyn"],
  ["INV-1594", 2.0, "BBA0087", "Pradeepval", "flexible", "2026-09-29", "11:30", "13:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Marlyn"],
  ["INV-1595", 2.0, "BBA0058", "Athena", "fortnightly", "2026-09-29", "12:00", "14:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Lanie", "Glaiza"],
  ["INV-1591", 1.33, "BBA0094", "Hindia", "weekly", "2026-09-28", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Ivy"],
  ["INV-1592", 1.5, "BBA0057", "Dee", "weekly", "2026-09-28", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Ivy"],
  ["INV-1593", 2.0, "BBA0027", "SiM", "weekly", "2026-09-28", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-28", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["INV-1588", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-28", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Ivy"],
  ["INV-1589", 2.0, "BBA0037", "Lorna", "weekly", "2026-09-28", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Glaiza", "Ivy"],
  ["INV-1590", 2.5, "BBA0035", "Kate", "fortnightly", "2026-09-28", "09:30", "12:00", 2.5, 60.0, "Invoice", "51 Koonawba Valley Cl, Byford", "Glaiza", "Ivy"],
  ["INV-1585", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-09-25", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Glaiza"],
  ["INV-1586", 2.0, "BBA0098", "Adam", "fortnightly", "2026-09-25", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Glaiza"],
  ["INV-1587", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-09-25", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Glaiza"],
  ["paid 25/09", 2.0, "BBA0033", "Linda", "fortnightly", "2026-09-25", "09:30", "11:30", 2.0, 60.0, "Invoice", "32 Alston Way, Byford", "Mars", "Ivy"],
  ["paid 26/09", 2.0, "BBA0041", "Deb", "fortnightly", "2026-09-25", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Mars", "Ivy"],
  ["", 2.0, "BBA0047", "Rhianna", "flexible", "2026-09-24", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Glaiza", "Glaiza"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-24", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["INV-1582", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-24", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Glaiza"],
  ["INV-1583", 1.5, "BBA0027", "SiM", "weekly", "2026-09-24", "17:00", "18:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["paid 25/09", 3.5, "BBA0049", "Levi", "fortnightly", "2026-09-24", "09:30", "13:00", 3.5, 60.0, "Invoice", "10 Walters Rd, Byford", "Zita", "Ivy, Marlyn"],
  ["paid 28/09", 2.0, "BBA0088", "Maram", "fortnightly", "2026-09-24", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Zita", "Ivy, Marlyn"],
  ["paid 24/09", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-09-24", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Zita", "Ivy, Marlyn"],
  ["paid 24/09", 2.0, "BBA0051", "Durant W", "fortnightly", "2026-09-23", "09:30", "11:30", 2.0, 60.0, "Invoice", "19 Durant Way, Byford", "Zita", "Ivy"],
  ["INV-1580", 1.67, "BBA0034", "Dee", "fortnightly", "2026-09-22", "09:45", "11:25", 1.67, 58.03, "Invoice", "16 Hardey Rd (NDIS), Glen Forrest", "Zita", "Ivy"],
  ["INV-1581", 2.0, "BBA0049", "Jacqui", "fortnightly", "2026-09-22", "09:30", "11:30", 2.0, 60.0, "Invoice", "100 Richardson St (NDIS), Serpentine", "Zita", "Ivy"],
  ["paid 23/09", 2.0, "BBA0006", "Sylvana", "fortnightly", "2026-09-22", "11:45", "13:45", 2.0, 60.0, "Cash", "1089 Forrest St, Peppermint Grove Beach", "Zita", "Ivy"],
  ["paid 23/09", 2.0, "BBA0088", "Maram", "fortnightly", "2026-09-21", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lanie", "Marlyn"],
  ["paid 22/09", 2.0, "BBA0037", "Lorna", "weekly", "2026-09-21", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lanie", "Marlyn"],
  ["paid 26/09", 2.0, "BBA0019", "Linda", "fortnightly", "2026-09-21", "09:30", "11:30", 2.0, 55.0, "Invoice", "8 Jersey Rd, Oakford", "Mars - Special clean / spa note in sheet", "Ivy"],
  ["paid 21/09", 2.0, "BBA0058", "Athena", "fortnightly", "2026-09-21", "12:00", "14:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Mars", "Ivy"],
  ["paid 22/09", 1.33, "BBA0094", "Hindia", "weekly", "2026-09-18", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Glaiza"],
  ["paid 21/09", 1.5, "BBA0057", "Dee", "weekly", "2026-09-18", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Glaiza"],
  ["paid 21/09", 1.5, "BBA0042", "Robyn", "fortnightly", "2026-09-18", "09:15", "10:45", 1.5, 58.03, "Cash", "19 Cappuccino Dr, Baldivis", "Zita", "Ivy"],
  ["paid 21/09", 1.5, "BBA0096", "Laura Scott", "fortnightly", "2026-09-18", "13:30", "15:00", 1.5, 55.0, "Cash", "25 Bellingham Parade, Wellard", "Zita", "Ivy"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-18", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["paid 21/09", 2.0, "BBA0041", "Deb", "fortnightly", "2026-09-18", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Zita", "Ivy"],
  ["paid 18/09", 2.0, "BBA0097", "Jacqui", "fortnightly", "2026-09-17", "09:30", "11:30", 2.0, 55.0, "Cash", "29 Portman Parade, Byford", "Glaiza", "Glaiza"],
  ["paid 18/09", 2.0, "BBA0077", "Sylvana", "fortnightly", "2026-09-17", "12:00", "14:00", 2.0, 60.0, "Cash", "2 Bischoff Rd, Hammond Park", "Glaiza", "Glaiza"],
  ["paid 18/09", 2.0, "BBA0047", "Rhianna", "flexible", "2026-09-17", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Marlyn"],
  ["paid 17/09", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-09-17", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Lanie", "Marlyn"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-17", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["INV-1579", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-17", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Glaiza"],
  ["paid 17/09", 1.5, "BBA0026", "SiM", "weekly", "2026-09-17", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["paid 17/09", 2.0, "BBA0029", "Dr. Jen", "fortnightly", "2026-09-16", "10:45", "12:45", 2.0, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Zita", "Ivy"],
  ["paid 16/09", 1.5, "BBA0073", "James", "fortnightly", "2026-09-16", "09:30", "11:00", 1.5, 55.0, "Cash", "11 Waylen Rd, Golden Bay", "Zita", "Ivy"],
  ["paid 16/09", 2.0, "BBA0087", "Pradeepval", "flexible", "2026-09-16", "11:30", "13:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Zita", "Ivy"],
  ["INV-1578", 2.0, "BBA0027", "SiM", "weekly", "2026-09-16", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "Lanie", "Marlyn"],
  ["paid 16/09", 1.5, "BBA0043", "Sally", "fortnightly", "2026-09-16", "12:30", "14:00", 1.5, 55.0, "Cash", "44 Somerford Promenade, Wellard", "Lanie", "Marlyn"],
  ["paid 16/09", 2.0, "BBA0052", "Kellam", "fortnightly", "2026-09-16", "09:30", "11:30", 2.0, 55.0, "Cash", "48 Kellam Way, Wellard", "Lanie", "Marlyn"],
  ["INV-1575", 2.0, "BBA0045", "Kenton", "fortnightly", "2026-09-15", "09:30", "11:30", 2.0, 60.0, "Invoice", "17 Kenton Way, Calista", "Lanie", "Glaiza"],
  ["paid 16/09", 2.0, "BBA0088", "Maram", "fortnightly", "2026-09-15", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lanie", "Glaiza"],
  ["INV-1576", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-15", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Lyn", "Ivy"],
  ["INV-1577-L", 2.0, "BBA0037", "Lorna", "weekly", "2026-09-15", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lyn", "Ivy"],
  ["paid 15/09", 2.0, "BBA0042", "Robyn", "fortnightly", "2026-09-15", "11:20", "13:20", 2.0, 55.0, "Cash", "19 Cappuccino Dr, Baldivis", "Lyn", "Ivy, BJ"],
  ["INV-1572", 2.0, "BBA0033", "Linda", "fortnightly", "2026-09-15", "13:30", "15:30", 2.0, 60.0, "Invoice", "32 Alston Way, Byford", "Lyn", "Ivy, BJ"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-15", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  
  // NOTE: INV-1584 has ######## corrupted in sheet -> FIXED to 11:30 AM
  ["INV-1584", 2.0, "BBA0041", "Dominic", "one-off", "2026-09-14", "09:30", "11:30", 2.0, 60.0, "Cash", "158 Sapphire Chase, Wellard", "Fixed Excel overflow error ######## -> 11:30 AM. Zita", "Ivy"],
  ["paid 15/09", 2.5, "BBA0005", "Natasha", "fortnightly", "2026-09-14", "09:30", "12:00", 2.5, 60.0, "Cash", "508 Hills Rd, North Dandalup", "Lyn", "Glaiza"],
  ["INV-1573", 2.0, "BBA0058", "Athena", "fortnightly", "2026-09-14", "13:30", "15:30", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Lyn", "Glaiza"],
  ["INV-1574", 2.0, "BBA0109", "Cindy", "fortnightly", "2026-09-14", "11:45", "13:45", 2.0, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lyn", "Glaiza"],
  ["paid 14/09", 0.67, "BBA0067", "Teddy", "weekly", "2026-09-11", "12:30", "13:10", 0.67, 60.0, "Cash", "82 Maraboo Loop, North Coogee", "Mars", "Ivy"],
  ["paid 11/09", 1.33, "BBA0094", "Hindia", "weekly", "2026-09-11", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Glaiza"],
  ["paid 11/09", 1.5, "BBA0057", "Dee", "weekly", "2026-09-11", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Glaiza"],
  ["paid 12/09", 2.5, "BBA0063", "Maram", "once-a-month", "2026-09-11", "11:15", "13:45", 2.5, 50.0, "Cash", "4 Orleans Vista, Wellard", "Zita", "Marlyn"],
  ["paid 11/09", 1.5, "BBA0065", "Sarah", "flexible", "2026-09-11", "09:30", "11:00", 1.5, 60.0, "Cash", "14 Inparra Way (NDIS), Wellard", "Zita", "Marlyn"],
  ["INV-1570", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-09-11", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Zita", "Ivy"],
  ["INV-1571", 2.0, "BBA0098", "Adam", "fortnightly", "2026-09-11", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Zita", "Ivy"],
  ["INV-1567", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-09-11", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Glaiza"],
  ["INV-1568", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-10", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Ivy"],
  ["INV-1569", 1.5, "BBA0027", "SiM", "weekly", "2026-09-10", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Ivy"],
  ["paid 11/09", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-09-10", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Glaiza", "Ivy"],
  ["", 2.0, "BBA0047", "Rhianna", "flexible", "2026-09-10", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Glaiza"],
  ["", 1.5, "BBA0010", "Serpentine", "weekly", "2026-09-10", "17:30", "19:00", 1.5, 55.0, "Invoice", "28 Maxwell St, Serpentine", "Glaiza", "Glaiza"],
  ["paid 10/09", 3.5, "BBA0049", "Levi", "fortnightly", "2026-09-10", "09:30", "13:00", 3.5, 60.0, "Invoice", "10 Walters Rd, Byford", "Mars", "Marlyn"],

  // Historical April - August 2026 anchor jobs from sheet
  ["INV-1564", 2.0, "BBA0034", "Dee", "fortnightly", "2026-09-08", "09:45", "11:25", 1.67, 58.03, "Invoice", "16 Hardey Rd (NDIS), Glen Forrest", "Zita", "Ivy"],
  ["paid 08/09", 2.0, "BBA0049", "Jacqui", "fortnightly", "2026-09-08", "09:30", "11:30", 2.0, 60.0, "Invoice", "100 Richardson St (NDIS), Serpentine", "Zita", "Ivy"],
  ["paid 09/09", 2.0, "BBA0006", "Sylvana", "fortnightly", "2026-09-08", "11:45", "13:45", 2.0, 60.0, "Cash", "1089 Forrest St, Peppermint Grove Beach", "Zita", "Ivy"],
  ["INV-1565", 2.0, "BBA0041", "Deb", "fortnightly", "2026-09-07", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Lanie", "Marlyn"],
  ["INV-1566", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-07", "09:30", "11:30", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Lanie", "Marlyn"],
  ["paid 08/09", 2.0, "BBA0037", "Lorna", "weekly", "2026-09-07", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lanie", "Marlyn"],
  ["paid 08/09", 2.0, "BBA0109", "Cindy", "fortnightly", "2026-09-07", "11:45", "13:45", 2.0, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Marlyn"],
  ["paid 05/09", 1.33, "BBA0094", "Hindia", "weekly", "2026-09-04", "09:45", "11:05", 1.33, 58.03, "Invoice", "159 Huntington Ave, Wellard", "Lanie", "Ivy"],
  ["INV-1561", 1.5, "BBA0057", "Dee", "weekly", "2026-09-04", "11:30", "13:00", 1.5, 60.0, "Invoice", "28 Maxwell St, Serpentine", "Lanie", "Ivy"],
  ["INV-1562", 2.0, "BBA0027", "SiM", "weekly", "2026-09-04", "19:00", "21:00", 2.0, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["INV-1563", 2.5, "BBA0035", "Kate", "fortnightly", "2026-09-04", "09:30", "12:00", 2.5, 60.0, "Invoice", "51 Koonawba Valley Cl, Byford", "Glaiza", "Glaiza"],
  ["paid 04/09", 2.0, "BBA0088", "Maram", "fortnightly", "2026-09-03", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Glaiza", "Glaiza"],
  ["paid 03/09", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-09-03", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Glaiza", "Glaiza"],
  ["INV-1559", 2.0, "BBA0036", "Ziggy", "weekly", "2026-09-03", "13:00", "15:00", 2.0, 58.03, "Invoice", "30 Stevenson Blvd, Wellard", "Glaiza", "Glaiza"],
  ["INV-1560", 1.5, "BBA0027", "SiM", "weekly", "2026-09-03", "19:00", "20:30", 1.5, 55.0, "Invoice", "18 Carron Way, Byford", "Glaiza", "Glaiza"],
  ["paid 01/09", 2.0, "BBA0077", "Sylvana", "fortnightly", "2026-09-01", "12:00", "14:00", 2.0, 60.0, "Cash", "2 Bischoff Rd, Hammond Park", "Mars", "Evelyn, Zita"],
  ["paid 01/09", 2.0, "BBA0097", "Jacqui", "fortnightly", "2026-09-01", "09:30", "11:30", 2.0, 55.0, "Cash", "29 Portman Parade, Byford", "Mars", "Evelyn, Zita"],
  ["paid 29/08", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-08-28", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ivy"],
  ["INV-1555", 2.0, "BBA0098", "Adam", "fortnightly", "2026-08-28", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ivy"],
  ["INV-1556", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-08-28", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Ivy"],
  ["INV-1557", 2.0, "BBA0033", "Linda", "fortnightly", "2026-08-28", "09:30", "11:30", 2.0, 60.0, "Invoice", "32 Alston Way, Byford", "Glaiza", "Glaiza"],
  ["paid 28/08", 1.5, "BBA0043", "Sally", "fortnightly", "2026-08-28", "12:30", "14:00", 1.5, 55.0, "Cash", "44 Somerford Promenade, Wellard", "Glaiza", "Glaiza"],
  ["paid 27/08", 2.0, "BBA0016", "Karen / Horn", "weekly", "2026-08-27", "09:30", "11:30", 2.0, 55.0, "Cash", "13 Garnock Way, Byford", "Lanie", "Marlyn"],
  ["paid 27/08", 2.0, "BBA0047", "Rhianna", "flexible", "2026-08-27", "11:30", "13:30", 2.0, 60.0, "Cash", "Medina, Kwinana WA 6167", "Lanie", "Marlyn"],
  ["paid 25/08", 2.0, "BBA0037", "Lorna", "weekly", "2026-08-25", "09:30", "11:30", 2.0, 60.0, "Cash", "17 Winston Ave, Wellard", "Lanie", "Marlyn"],
  ["INV-1549", 2.0, "BBA0041", "Deb", "fortnightly", "2026-08-24", "12:40", "14:40", 2.0, 60.0, "Invoice", "58 James St, Pinjarra", "Zita", "Ivy"],
  ["paid 21/08", 2.5, "BBA0005", "Natasha", "fortnightly", "2026-08-21", "09:30", "12:00", 2.5, 60.0, "Cash", "508 Hills Rd, North Dandalup", "Lanie", "Glaiza"],
  ["paid 21/08", 2.0, "BBA0058", "Athena", "fortnightly", "2026-08-21", "12:00", "14:00", 2.0, 60.0, "Cash", "12 Oakfield Vista, Wellard", "Lanie", "Glaiza"],
  ["paid 18/08", 2.0, "BBA0088", "Maram", "fortnightly", "2026-08-18", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lanie", "Marlyn, Bea"],
  ["paid 14/08", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-08-14", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Glaiza"],
  ["INV-1540", 2.0, "BBA0098", "Adam", "fortnightly", "2026-08-14", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Glaiza"],
  ["INV-1541", 2.0, "BBA0030", "Kavitha", "fortnightly", "2026-08-14", "13:30", "15:30", 2.0, 60.0, "Invoice", "14 Callista St, Byford", "Lanie", "Glaiza"],
  ["INV-1533", 2.5, "BBA0035", "Kate", "fortnightly", "2026-08-07", "09:30", "12:00", 2.5, 60.0, "Invoice", "51 Koonawba Valley Cl, Byford", "Mars", "Marlyn, Bea"],
  ["paid 31/07", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-07-31", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ivy, Glaiza"],
  ["INV-1522", 2.0, "BBA0098", "Adam", "fortnightly", "2026-07-31", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ivy, Glaiza"],
  ["paid 24/07", 2.0, "BBA0088", "Maram", "fortnightly", "2026-07-24", "12:15", "14:15", 2.0, 60.0, "Cash", "34 Carinata St, Byford", "Lanie", "Marlyn, Mitchell"],
  ["paid 17/07", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-07-17", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ivy"],
  ["INV-1508", 2.0, "BBA0098", "Adam", "fortnightly", "2026-07-17", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ivy"],
  ["paid 03/07", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-07-03", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ivy, Glaiza"],
  ["INV-1491", 2.0, "BBA0098", "Adam", "fortnightly", "2026-07-03", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ivy, Glaiza"],
  ["paid 19/06", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-06-19", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ivy"],
  ["INV-1472", 2.0, "BBA0098", "Adam", "fortnightly", "2026-06-19", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ivy"],
  ["paid 05/06", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-06-05", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Ethel, Marlyn"],
  ["INV-1454", 2.0, "BBA0098", "Adam", "fortnightly", "2026-06-05", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Ethel, Marlyn"],
  ["paid 22/05", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-05-22", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Evelyn, Inessa"],
  ["INV-1436", 2.0, "BBA0098", "Adam", "fortnightly", "2026-05-22", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Evelyn, Inessa"],
  ["paid 08/05", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-05-08", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Evelyn, Vince"],
  ["INV-1418", 2.0, "BBA0098", "Adam", "fortnightly", "2026-05-08", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Evelyn, Vince"],
  ["paid 24/04", 2.25, "BBA0108", "Olivia", "fortnightly", "2026-04-24", "12:00", "14:15", 2.25, 55.0, "Cash", "11 Littletree Rd, Orelia", "Lanie", "Evelyn, Ronald"],
  ["INV-1401", 2.0, "BBA0098", "Adam", "fortnightly", "2026-04-24", "09:30", "11:30", 2.0, 58.03, "Invoice", "18 Ungarra Rd (NDIS), Wellard", "Lanie", "Evelyn, Ronald"]
];

// Cleaner mapping lookup helper
function mapCleanerNames(cleanerStr) {
  if (!cleanerStr || !cleanerStr.trim()) return ['cleaner-lanie'];
  const names = cleanerStr.split(/[,/&]+/).map(s => s.trim().toLowerCase());
  const ids = [];

  const nameMap = {
    'lanie': 'cleaner-lanie',
    'ivy': 'cleaner-ivy',
    'glaiza': 'cleaner-glaiza',
    'glaza': 'cleaner-glaiza',
    'marlyn': 'cleaner-marlyn',
    'mars': 'cleaner-marlyn',
    'lyn': 'cleaner-marlyn',
    'zita': 'cleaner-zita',
    'zely': 'cleaner-zita',
    'grace': 'cleaner-grace',
    'bj': 'cleaner-bj',
    "b'j": 'cleaner-bj',
    'evelyn': 'cleaner-evelyn',
    'ronald': 'cleaner-ronald',
    'lorie': 'cleaner-lorie',
    'bea': 'cleaner-bea',
    'inessa': 'cleaner-inessa',
    'inssa': 'cleaner-inessa',
    'beverly': 'cleaner-beverly',
    'aubrie': 'cleaner-aubrie',
    'vince': 'cleaner-vince',
    'mitchell': 'cleaner-mitchell',
    'mitch': 'cleaner-mitchell',
    'rhenna': 'cleaner-rhenna',
    'ethel': 'cleaner-ethel',
    'etihl': 'cleaner-ethel',
    'etihil': 'cleaner-ethel'
  };

  names.forEach(n => {
    if (nameMap[n] && !ids.includes(nameMap[n])) {
      ids.push(nameMap[n]);
    }
  });

  return ids.length > 0 ? ids : ['cleaner-lanie'];
}

// Infer JobType from address & client
function inferJobType(address, clientName, rate) {
  if (address.includes('NDIS') || clientName.includes('NDIS')) return 'NDIS Cleaning';
  if (address.includes('Commercial') || clientName.includes('Studio') || clientName.includes('First National')) return 'Commercial Office';
  if (address.includes('Bond') || address.includes('Turnaround')) return 'End of Lease / Bond';
  if (rate >= 65 || address.includes('Deep')) return 'Residential Deep Clean';
  return 'Residential Standard';
}

// Generate tasks
const tasks = rawRows.map((row, index) => {
  const [
    invCol, fixH, clientNo, name, schedule, dateStr, startTime, endTime, hours, rate, payTerm, address, remark, cleanersStr
  ] = row;

  let invoiceNumber = invCol && invCol.startsWith('INV-') ? invCol : `INV-${1640 + index}`;
  const isPaid = invCol.toLowerCase().startsWith('paid');
  const assignedCleanerIds = mapCleanerNames(cleanersStr);
  const jobType = inferJobType(address, name, rate);

  // Today is approx 2026-10-25; tasks on or before 2026-10-23 are completed if paid or past
  const completed = isPaid || new Date(dateStr) < new Date('2026-10-23');

  return {
    id: `spreadsheet-task-${index + 1}`,
    jobType,
    address,
    clientNumber: clientNo,
    clientName: name,
    clientPhone: `04${Math.floor(10000000 + Math.random() * 89999999)}`,
    clientEmail: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com.au`,
    fixHour: Number(fixH || hours || 2.0),
    rate: Number(rate),
    payType: 'Hourly',
    paymentTerm: payTerm === 'Invoice' ? 'Invoice' : 'Cash',
    invoiceNumber,
    assignedCleanerIds,
    remarks: remark ? remark : 'Routine cleaning as scheduled',
    date: dateStr,
    startTime,
    endTime,
    frequency: schedule,
    completed,
    createdAt: `${dateStr}T08:00:00.000Z`,
    isRecurring: schedule !== 'one-off' && schedule !== 'flexible' && schedule !== 'others'
  };
});

// Output TypeScript file
const outContent = `import { Task, Cleaner } from '../types';

export interface DataCorrection {
  invoice: string;
  client: string;
  date: string;
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

export const DATA_CORRECTIONS_LOG: DataCorrection[] = ${JSON.stringify(dataCorrectionsLog, null, 2)};

export const SPREADSHEET_CLEANERS: Cleaner[] = ${JSON.stringify(cleaners, null, 2)};

export const SPREADSHEET_TASKS: Task[] = ${JSON.stringify(tasks, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/spreadsheetData.ts'), outContent);
console.log('Successfully wrote /src/data/spreadsheetData.ts with', tasks.length, 'tasks and', cleaners.length, 'cleaners.');
