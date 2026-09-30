import type { SuggestionSectionId } from "./types";

export interface ArtistSeed {
  latin: string;
  cyrillic: string;
}

export interface SeedEntry {
  query: string;
  kind: "track" | "artist";
  alternatives?: readonly string[];
}

export interface SectionSeed {
  entries: readonly SeedEntry[];
  playlistQueries: readonly string[];
}

export type SeededSectionId = Exclude<SuggestionSectionId, "trending_here" | "dj_picks">;

export const uzbekArtists: readonly ArtistSeed[] = [
  { latin: "Shahzoda", cyrillic: "Шахзода" },
  { latin: "Ozoda", cyrillic: "Озода" },
  { latin: "Rayhon", cyrillic: "Райхон" },
  { latin: "Konsta", cyrillic: "Конста" },
  { latin: "Xamdam Sobirov", cyrillic: "Хамдам Собиров" },
  { latin: "Ulugbek Rahmatullaev", cyrillic: "Улугбек Рахматуллаев" },
  { latin: "Sardor Rahimxon", cyrillic: "Сардор Рахимхон" },
  { latin: "Jasur Umirov", cyrillic: "Жасур Умиров" },
  { latin: "Lola Yuldasheva", cyrillic: "Лола Юлдашева" },
  { latin: "Munisa Rizayeva", cyrillic: "Муниса Ризаева" },
  { latin: "Yulduz Usmonova", cyrillic: "Юлдуз Усманова" },
  { latin: "Shaxriyor", cyrillic: "Шахриёр" },
  { latin: "Dilnoza", cyrillic: "Дилноза" },
  { latin: "Ziyoda", cyrillic: "Зиёда" },
  { latin: "Bojalar", cyrillic: "Божалар" },
  { latin: "Mirzabek Xolmedov", cyrillic: "Мирзабек Холмедов" },
  { latin: "Farrux Xamrayev", cyrillic: "Фаррух Хамраев" },
  { latin: "Shohruhxon", cyrillic: "Шохрухон" },
  { latin: "Shoxrux", cyrillic: "Шохрух" },
  { latin: "Sevinch Mo'minova", cyrillic: "Севинч Муминова" },
  { latin: "Nilufar Usmonova", cyrillic: "Нилуфар Усмонова" },
  { latin: "Ozodbek Nazarbekov", cyrillic: "Озодбек Назарбеков" },
  { latin: "Jaloliddin Ahmadaliyev", cyrillic: "Жалолиддин Ахмадалиев" },
  { latin: "Mirjalol Nematov", cyrillic: "Миржалол Нематов" },
  { latin: "Xurshid Rasulov", cyrillic: "Хуршид Расулов" },
  { latin: "Jahongir Otajonov", cyrillic: "Жахонгир Отажонов" },
  { latin: "Janob Rasul", cyrillic: "Жаноб Расул" },
  { latin: "Botir Qodirov", cyrillic: "Ботир Кодиров" },
  { latin: "Dildora Niyozova", cyrillic: "Дилдора Ниёзова" },
  { latin: "Doston Ergashev", cyrillic: "Достон Эргашев" },
  { latin: "Bunyodbek Saidov", cyrillic: "Бунёдбек Саидов" },
  { latin: "Bahrom Nazarov", cyrillic: "Бахром Назаров" },
  { latin: "Sardor Mamadaliyev", cyrillic: "Сардор Мамадалиев" },
  { latin: "Uzmir", cyrillic: "Узмир" },
  { latin: "Sherali Jo'rayev", cyrillic: "Шерали Жураев" },
  { latin: "Sevara Nazarkhan", cyrillic: "Севара Назархан" },
  { latin: "Oybek & Nigora", cyrillic: "Ойбек и Нигора" },
  { latin: "Ummon", cyrillic: "Уммон" },
];

const uzbekHitQueries: readonly string[] = [
  "Shahzoda Habibi",
  "Ozoda Alamlar",
  "Shohruhxon Esingdami ayt",
  "Xamdam Sobirov Janze",
  "Shoxrux Tasodifan",
  "Sevinch Mo'minova Ne bo'ldi",
  "Ozoda Tasalli ber",
  "Shahzoda Billionaire",
  "Rayhon Orzuinga ishon",
  "Shoxrux Hato",
  "Ziyoda Qora atirgul",
  "Konsta Butterfly",
  "Yulduz Usmonova Yor biyo",
  "Shohruhxon Seviyorum",
  "Ozoda Jichcha yomonman",
  "Nilufar Usmonova Qirmizi olma",
  "Shahzoda Maqtanchoq",
  "Shohruhxon Oy jamol",
  "Sevinch Mo'minova Ko'ylagim",
  "Shoxrux Xayolimdasan",
  "Konsta Chekish o'ldiradi",
  "Yulduz Usmonova Muhabbating",
  "Ziyoda O'yna-o'yna",
  "Shohruhxon Bezori",
  "Sevara Nazarkhan Yor-yor",
  "Necha bora ketarding",
  "Ulugbek Rahmatullaev Tabib",
];

function hitEntries(queries: readonly string[]): SeedEntry[] {
  return queries.map((query) => ({ query, kind: "track" }));
}

function artistEntries(artists: readonly ArtistSeed[]): SeedEntry[] {
  return artists.map((artist) => ({
    query: artist.latin,
    kind: "artist",
    alternatives: [artist.cyrillic],
  }));
}

export const sectionSeeds: Record<SeededSectionId, SectionSeed> = {
  uz_hits: {
    entries: [...hitEntries(uzbekHitQueries), ...artistEntries(uzbekArtists)],
    playlistQueries: ["Uzbek hits", "uzbek pop"],
  },
  ru_pop: {
    entries: hitEntries([
      "Zivert Life",
      "ANNA ASTI По барам",
      "Artik & Asti Грустный дэнс",
      "Miyagi & Andy Panda Minor",
      "Клава Кока Покинула чат",
      "NILETTO Любимка",
      "JONY Комета",
      "HammAli & Navai Птичка",
      "Полина Гагарина Кукушка",
      "Little Big UNO",
      "Дима Билан Believe",
      "Ани Лорак Обними меня крепче",
      "Мот Капкан",
      "Егор Крид Голубые глаза",
      "Zivert Beverly Hills",
      "Sergey Lazarev Scream",
      "Serebro Мама Люба",
      "Григорий Лепс Рюмка водки на столе",
      "Земфира Хочешь",
      "Нюша Выбирать чудо",
      "Филипп Киркоров Цвет настроения синий",
    ]).concat(artistEntries([{ latin: "Ruki Vverh", cyrillic: "Руки Вверх" }])),
    playlistQueries: ["russian pop hits", "русский поп"],
  },
  club: {
    entries: hitEntries([
      "Calvin Harris One Kiss",
      "Dua Lipa Levitating",
      "The Weeknd Blinding Lights",
      "David Guetta Titanium",
      "Daft Punk One More Time",
      "Martin Garrix Animals",
      "Alan Walker Faded",
      "Avicii Levels",
      "MEDUZA Piece Of Your Heart",
      "Swedish House Mafia Don't You Worry Child",
      "Tiësto The Business",
      "Kygo Firestone",
      "Robin Schulz Sugar",
      "Fred again.. Delilah",
      "Bad Bunny Tití Me Preguntó",
      "Rihanna Where Have You Been",
      "Black Eyed Peas I Gotta Feeling",
      "Lady Gaga Bad Romance",
      "Ed Sheeran Shape of You",
      "Sia Cheap Thrills",
      "Dua Lipa Don't Start Now",
      "Benny Benassi Satisfaction",
      "Tom Odell Another Love",
      "Camila Cabello Havana",
      "Pitbull Timber",
      "Shahzoda Habibi Albi Remix",
    ]),
    playlistQueries: ["club hits", "dance party"],
  },
  slow: {
    entries: hitEntries([
      "Ed Sheeran Perfect",
      "Adele Someone Like You",
      "Sam Smith Stay With Me",
      "Lewis Capaldi Someone You Loved",
      "Céline Dion My Heart Will Go On",
      "Whitney Houston I Will Always Love You",
      "Bruno Mars When I Was Your Man",
      "John Legend All of Me",
      "Christina Perri A Thousand Years",
      "Scorpions Still Loving You",
      "Eric Clapton Tears in Heaven",
      "Rihanna Diamonds",
      "Coldplay Yellow",
      "Yulduz Usmonova Sevaman",
      "Ozoda Tasalli ber",
      "Полина Гагарина Обезоружена",
      "JONY Аллея",
      "Ани Лорак Обними меня крепче",
      "Bryan Adams Heaven",
      "Elvis Presley Can't Help Falling In Love",
      "Ben E. King Stand By Me",
      "Lionel Richie Hello",
      "Sting Shape Of My Heart",
    ]),
    playlistQueries: ["slow songs", "love ballads"],
  },
  birthday: {
    entries: hitEntries([
      "Stevie Wonder Happy Birthday",
      "Katy Perry Birthday",
      "50 Cent In Da Club",
      "The Beatles Birthday",
      "Kool & The Gang Celebration",
      "Mark Ronson Uptown Funk",
      "Pharrell Williams Happy",
      "Bruno Mars 24K Magic",
      "Ленинград День рождения",
      "Арсен Шахунц С Днем Рождения",
      "Tug'ilgan kun muborak",
      "Tug'ilgan kun",
      "Cyndi Lauper Girls Just Want to Have Fun",
      "Elton John I'm Still Standing",
      "Queen Don't Stop Me Now",
      "ABBA Dancing Queen",
      "Gloria Gaynor I Will Survive",
      "Whitney Houston I Wanna Dance with Somebody",
    ]),
    playlistQueries: ["happy birthday party", "birthday party"],
  },
};
