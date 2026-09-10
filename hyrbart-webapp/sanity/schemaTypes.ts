import { defineArrayMember, defineField, defineType } from 'sanity';
import { BadgeInput, RentalPricesInput, TranslationToolInput } from './TranslationToolInput';

export const localizedString = defineType({
  name: 'localizedString',
  title: 'Lokaliserad korttext',
  type: 'object',
  fields: [
    defineField({ name: 'sv', title: 'Svenska', type: 'string' }),
    defineField({ name: 'en', title: 'Engelska', type: 'string' }),
  ],
});

export const localizedText = defineType({
  name: 'localizedText',
  title: 'Lokaliserad text',
  type: 'object',
  fields: [
    defineField({ name: 'sv', title: 'Svenska', type: 'text', rows: 4 }),
    defineField({ name: 'en', title: 'Engelska', type: 'text', rows: 4 }),
  ],
});

export const rentalPrice = defineType({
  name: 'rentalPrice',
  title: 'Hyrespris',
  type: 'object',
  fields: [
    defineField({ name: 'days', title: 'Antal dagar', type: 'number' }),
    defineField({ name: 'price', title: 'Pris', type: 'number' }),
  ],
});

export const specification = defineType({
  name: 'specification',
  title: 'Specifikation',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'value', title: 'Värde', type: 'string' }),
  ],
});

export const guideCard = defineType({
  name: 'guideCard',
  title: 'Guidekort',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'body', title: 'Text', type: 'localizedText' }),
  ],
});

export const guideSection = defineType({
  name: 'guideSection',
  title: 'Guidesektion',
  type: 'object',
  fields: [
    defineField({ name: 'key', title: 'Nyckel', type: 'string' }),
    defineField({ name: 'stepNumber', title: 'Stegnummer', type: 'number' }),
    defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
    defineField({ name: 'intro', title: 'Introduktion', type: 'localizedText' }),
    defineField({
      name: 'cards',
      title: 'Guidekort',
      type: 'array',
      of: [defineArrayMember({ type: 'guideCard' })],
    }),
    defineField({
      name: 'infoBox',
      title: 'Informationsruta',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'Rubrik', type: 'localizedString' }),
        defineField({ name: 'body', title: 'Text', type: 'localizedText' }),
      ],
    }),
  ],
});

const categories = [
  'Barnartiklar',
  'Belysning',
  'Biltillbehör',
  'Borra & Skruva',
  'Handverktyg',
  'Hem & hushåll',
  'Håltagning',
  'Kontor',
  'Luftverktyg',
  'Mäta',
  'Städa & Tvätta',
  'Såga & Slipa',
  'Trädgård',
  'Värme',
];

export const product = defineType({
  name: 'product',
  title: 'Produkt',
  type: 'document',
  fieldsets: [
    {
      name: 'ratingInfo',
      options: { columns: 2 },
    },
  ],
  fields: [
    defineField({
      name: 'category',
      title: 'Kategori',
      description: 'Övergripande kategori som används för filtreringen i produktlistan.',
      type: 'string',
      options: { list: categories.map((value) => ({ title: value, value })) },
    }),
    defineField({ name: 'typeSv', title: 'Produkttyp – svenska', type: 'string' }),
    defineField({ name: 'typeEn', title: 'Produkttyp – engelska', type: 'string' }),
    defineField({ name: 'brand', title: 'Varumärke', type: 'string' }),
    defineField({ name: 'name', title: 'Produktnamn', type: 'string' }),
    defineField({
      name: 'cardHighlight',
      title: 'Highlight',
      type: 'localizedString',
    }),
    defineField({
      name: 'slug',
      title: 'Web-adress',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Produktbilder',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
    }),
    defineField({
      name: 'badge',
      title: 'Popularitetsstämpel',
      type: 'string',
      components: { input: BadgeInput },
      options: {
        list: [
          { title: 'POPULÄR', value: 'popular' },
          { title: 'JÄTTEPOPULÄR', value: 'very-popular' },
        ],
      },
    }),
    defineField({ name: 'rating', title: 'Betyg', type: 'number', fieldset: 'ratingInfo' }),
    defineField({ name: 'reviewCount', title: 'Antal omdömen', type: 'number', fieldset: 'ratingInfo' }),
    defineField({
      name: 'rentalPrices',
      title: 'Hyrespriser',
      type: 'array',
      of: [defineArrayMember({ type: 'rentalPrice' })],
      components: { input: RentalPricesInput },
    }),
    defineField({
      name: 'included',
      title: 'Detta ingår',
      type: 'array',
      of: [defineArrayMember({ type: 'localizedString' })],
    }),
    defineField({ name: 'description', title: 'Produktbeskrivning', type: 'localizedText' }),
    defineField({
      name: 'specifications',
      title: 'Tekniska specifikationer',
      type: 'array',
      of: [defineArrayMember({ type: 'specification' })],
    }),
    defineField({
      name: 'guideSections',
      title: 'Användarguide',
      type: 'array',
      of: [defineArrayMember({ type: 'guideSection' })],
    }),
    defineField({
      name: 'hyggloUrl',
      title: 'Hygglo-länk',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'supplierUrl',
      title: 'Länk till leverantörshemsida',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'translationTool',
      title: 'Automatisk översättning',
      type: 'string',
      components: { input: TranslationToolInput },
      description: 'Översätter produktens svenska texter till engelska utan att ändra annan produktdata.',
    }),

    // Äldre fält behålls dolt tills befintlig data är helt migrerad/rensad.
    defineField({
      name: 'detailCategory',
      title: 'Kategori på produktsidan (tidigare)',
      type: 'localizedString',
      hidden: true,
      readOnly: true,
      deprecated: { reason: 'Produkttyp används nu både i produktlistan och på produktsidan.' },
    }),
    defineField({
      name: 'accent',
      title: 'Accentfärg (tidigare)',
      type: 'string',
      hidden: true,
      readOnly: true,
      deprecated: { reason: 'Hyrbarts gemensamma accentfärg används för alla produkter.' },
    }),
    defineField({
      name: 'image',
      title: 'Äldre huvudbild',
      type: 'image',
      hidden: true,
      readOnly: true,
      deprecated: { reason: 'Produktbilder används i stället.' },
    }),
    defineField({
      name: 'legacyImagePath',
      title: 'Äldre bildsökväg',
      type: 'string',
      hidden: true,
      readOnly: true,
      deprecated: { reason: 'Produktbilder används i stället.' },
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sorteringsordning (tidigare)',
      type: 'number',
      hidden: true,
      readOnly: true,
      deprecated: { reason: 'Produktlistan sorteras automatiskt i bokstavsordning efter produkttyp.' },
    }),
  ],
  preview: {
    select: { brand: 'brand', name: 'name', media: 'images.0' },
    prepare({ brand, name, media }) {
      return { title: `${brand ?? ''} ${name ?? ''}`.trim(), media };
    },
  },
});

export const schemaTypes = [
  product,
  localizedString,
  localizedText,
  rentalPrice,
  specification,
  guideCard,
  guideSection,
];
