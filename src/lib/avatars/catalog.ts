export type AvatarItem = { id: string; name: string };
export type AvatarGroup = { group: string; items: AvatarItem[]; transparent?: boolean };

export const avatarUrl = (id: string): string => `/avatars/${id}.webp`;

export const AVATAR_CATALOG: AvatarGroup[] = [
  {
    group: "People",
    transparent: true,
    items: [
      { id: "compass_person_01", name: "Person 1" },
      { id: "compass_person_02", name: "Person 2" },
      { id: "compass_person_03", name: "Person 3" },
      { id: "compass_person_04", name: "Person 4" },
      { id: "compass_person_05", name: "Person 5" },
      { id: "compass_person_06", name: "Person 6" },
      { id: "compass_person_07", name: "Person 7" },
      { id: "compass_person_08", name: "Person 8" },
      { id: "compass_person_09", name: "Person 9" },
      { id: "compass_person_10", name: "Person 10" },
      { id: "compass_person_11", name: "Person 11" },
      { id: "compass_person_12", name: "Person 12" },
      { id: "compass_person_13", name: "Person 13" },
      { id: "compass_person_14", name: "Person 14" },
      { id: "compass_person_15", name: "Person 15" },
      { id: "compass_person_16", name: "Person 16" },
      { id: "compass_person_17", name: "Person 17" },
    ],
  },
  {
    group: "Face",
    items: [
      { id: "compass_face_01", name: "Red" },
      { id: "compass_face_02", name: "Orange" },
      { id: "compass_face_03", name: "Gold" },
      { id: "compass_face_04", name: "Green" },
      { id: "compass_face_05", name: "Teal" },
      { id: "compass_face_06", name: "Blue" },
      { id: "compass_face_07", name: "Indigo" },
      { id: "compass_face_08", name: "Purple" },
      { id: "compass_face_09", name: "Pink" },
      { id: "compass_face_10", name: "Rose" },
      { id: "compass_face_11", name: "Slate" },
      { id: "compass_face_12", name: "Graphite" },
    ],
  },
  {
    group: "Misc",
    items: [
      { id: "compass_misc_01", name: "Dreamer" },
      { id: "compass_misc_02", name: "Rebel" },
      { id: "compass_misc_03", name: "Techie" },
      { id: "compass_misc_04", name: "Zen Master" },
      { id: "compass_misc_05", name: "Ninja" },
      { id: "compass_misc_06", name: "Robot" },
      { id: "compass_misc_08", name: "Wizard" },
    ],
  },
  {
    group: "Animals",
    items: [
      { id: "compass_animal_01", name: "Brave Lion" },
      { id: "compass_animal_02", name: "Cheerful Koala" },
      { id: "compass_animal_04", name: "Curious Raccoon" },
      { id: "compass_animal_05", name: "Friendly Bear" },
      { id: "compass_animal_06", name: "Happy Panda" },
      { id: "compass_animal_07", name: "Magic Unicorn" },
      { id: "compass_animal_08", name: "Mysterious Owl" },
    ],
  },
  {
    group: "Space",
    items: [
      { id: "compass_space_01", name: "Nova" },
      { id: "compass_space_02", name: "Satellite" },
      { id: "compass_space_03", name: "Visitor" },
    ],
  },
  {
    group: "Elements",
    items: [
      { id: "compass_element_01", name: "Earth" },
      { id: "compass_element_02", name: "Fire" },
      { id: "compass_element_03", name: "Electric" },
      { id: "compass_element_04", name: "Water" },
    ],
  },
  {
    group: "Manga",
    items: [
      { id: "eboy_manga_eyes_bw_zoomed", name: "Manga Boy" },
      { id: "egirl_manga_eyes_bw_zoomed_distinct", name: "Manga Girl" },
    ],
  },
  {
    group: "Kawaii",
    items: [
      { id: "compass_kawaii_01", name: "Grumpy" },
      { id: "compass_kawaii_02", name: "Shocked" },
      { id: "compass_kawaii_03", name: "Thinking" },
      { id: "compass_kawaii_04", name: "Kiss" },
      { id: "compass_kawaii_05", name: "Crying" },
      { id: "compass_kawaii_06", name: "Sly" },
      { id: "compass_kawaii_07", name: "Grin" },
      { id: "compass_kawaii_08", name: "Smile" },
      { id: "compass_kawaii_10", name: "Wink" },
    ],
  },
  {
    group: "Cats",
    items: [
      { id: "compass_cat_01", name: "Flash Tabby" },
      { id: "compass_cat_02", name: "Midnight Blep" },
      { id: "compass_cat_03", name: "Cloud Grump" },
      { id: "compass_cat_04", name: "Tiny Headset" },
    ],
  },
];

export const AVATAR_COUNT = AVATAR_CATALOG.reduce((n, g) => n + g.items.length, 0);

const KEPT_URLS = new Set(AVATAR_CATALOG.flatMap((g) => g.items.map((i) => avatarUrl(i.id))));

export function isRemovedBuiltinAvatar(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("/avatars/") && !KEPT_URLS.has(value);
}
