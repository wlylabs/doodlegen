import type { LanguageId } from './types';

/**
 * Ready-made word sets for the "Kata & Nama" mode.
 *
 * These are the lists these worksheets are actually made from: Dolch sight
 * words, CVC families, and the first vocabulary sets a preschool teaches.
 * They are shipped as data rather than fetched, so a pack can be built with
 * no network, and nothing here carries a licence that could follow a seller
 * into their listing — the Dolch lists are public domain, the rest are plain
 * vocabulary.
 */
export interface WordList {
  id: string;
  label: string;
  note: string;
  language: LanguageId;
  words: string[];
}

export const WORD_LISTS: WordList[] = [
  {
    id: 'cvc',
    label: 'CVC words',
    note: 'Tiga huruf, pola konsonan-vokal-konsonan',
    language: 'en',
    words: [
      'cat', 'hat', 'bat', 'mat', 'sun', 'run', 'fun', 'bug',
      'hug', 'rug', 'pig', 'big', 'dig', 'hen', 'pen', 'ten',
      'dog', 'log', 'top', 'mop',
    ],
  },
  {
    id: 'dolch-pre',
    label: 'Dolch pre-primer',
    note: 'Sight words paling dasar, 40 kata',
    language: 'en',
    words: [
      'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down',
      'find', 'for', 'funny', 'go', 'help', 'here', 'I', 'in',
      'is', 'it', 'jump', 'little', 'look', 'make', 'me', 'my',
      'not', 'one', 'play', 'red', 'run', 'said', 'see', 'the',
      'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
    ],
  },
  {
    id: 'dolch-primer',
    label: 'Dolch primer',
    note: 'Sight words tingkat berikutnya, 40 kata',
    language: 'en',
    words: [
      'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown',
      'but', 'came', 'did', 'do', 'eat', 'four', 'get', 'good',
      'have', 'he', 'into', 'like', 'must', 'new', 'no', 'now',
      'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw',
      'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
    ],
  },
  {
    id: 'colors-en',
    label: 'Colors',
    note: 'Warna dasar dalam bahasa Inggris',
    language: 'en',
    words: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white'],
  },
  {
    id: 'numbers-en',
    label: 'Number words',
    note: 'Angka satu sampai sepuluh, dieja',
    language: 'en',
    words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  },
  {
    id: 'animals-en',
    label: 'Animals',
    note: 'Hewan yang paling sering dipakai di kelas',
    language: 'en',
    words: ['cat', 'dog', 'cow', 'duck', 'fish', 'frog', 'bird', 'bear', 'lion', 'sheep', 'horse', 'mouse'],
  },
  {
    id: 'family-en',
    label: 'Family',
    note: 'Anggota keluarga dalam bahasa Inggris',
    language: 'en',
    words: ['mom', 'dad', 'baby', 'sister', 'brother', 'grandma', 'grandpa', 'family'],
  },
  {
    id: 'days-en',
    label: 'Days of the week',
    note: 'Tujuh hari, huruf besar di depan',
    language: 'en',
    words: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  {
    id: 'keluarga',
    label: 'Keluarga',
    note: 'Panggilan anggota keluarga',
    language: 'id',
    words: ['Ayah', 'Bunda', 'Adik', 'Kakak', 'Nenek', 'Kakek', 'Paman', 'Bibi'],
  },
  {
    id: 'warna',
    label: 'Warna',
    note: 'Warna dasar dalam bahasa Indonesia',
    language: 'id',
    words: ['Merah', 'Biru', 'Hijau', 'Kuning', 'Ungu', 'Jingga', 'Cokelat', 'Hitam', 'Putih'],
  },
  {
    id: 'hewan',
    label: 'Hewan',
    note: 'Hewan sehari-hari',
    language: 'id',
    words: ['Kucing', 'Anjing', 'Sapi', 'Ayam', 'Ikan', 'Bebek', 'Kambing', 'Kelinci', 'Burung', 'Katak'],
  },
  {
    id: 'buah',
    label: 'Buah',
    note: 'Buah yang mudah dikenali anak',
    language: 'id',
    words: ['Apel', 'Pisang', 'Jeruk', 'Mangga', 'Semangka', 'Anggur', 'Melon', 'Pepaya', 'Nanas'],
  },
  {
    id: 'angka-id',
    label: 'Angka dieja',
    note: 'Satu sampai sepuluh dalam huruf',
    language: 'id',
    words: ['Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'],
  },
  {
    id: 'tubuh',
    label: 'Anggota tubuh',
    note: 'Bagian tubuh untuk kelas PAUD',
    language: 'id',
    words: ['Mata', 'Hidung', 'Mulut', 'Telinga', 'Tangan', 'Kaki', 'Rambut', 'Gigi', 'Perut'],
  },
  {
    id: 'sekolah',
    label: 'Benda sekolah',
    note: 'Isi tas sekolah',
    language: 'id',
    words: ['Buku', 'Pensil', 'Tas', 'Meja', 'Kursi', 'Papan', 'Krayon', 'Penghapus', 'Sepatu'],
  },
  {
    id: 'hari',
    label: 'Hari',
    note: 'Tujuh hari dalam seminggu',
    language: 'id',
    words: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
  },
];

/** The textarea format: one entry per line. */
export function listToText(list: WordList): string {
  return list.words.join('\n');
}
