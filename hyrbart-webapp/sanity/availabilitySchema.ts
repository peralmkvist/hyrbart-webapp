import { defineField, defineType } from 'sanity';

export const availabilityBlock = defineType({
  name: 'availabilityBlock',
  title: 'Tillgänglighetsblockering',
  type: 'document',
  fields: [
    defineField({
      name: 'product',
      title: 'Produkt',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Från och med',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'Till och med',
      type: 'date',
      validation: (rule) => rule.required().custom((endDate, context) => {
        const startDate = context.document?.startDate as string | undefined;
        if (startDate && endDate && endDate < startDate) return 'Slutdatum måste vara samma dag eller senare än startdatum.';
        return true;
      }),
    }),
    defineField({
      name: 'reason',
      title: 'Orsak',
      type: 'string',
      options: {
        list: [
          { title: 'Bokad', value: 'booked' },
          { title: 'Blockerad av uthyrare', value: 'owner-block' },
          { title: 'Service / underhåll', value: 'maintenance' },
        ],
        layout: 'radio',
      },
      initialValue: 'owner-block',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'note', title: 'Intern notering', type: 'string' }),
  ],
  preview: {
    select: {
      productType: 'product.typeSv',
      productBrand: 'product.brand',
      productName: 'product.name',
      startDate: 'startDate',
      endDate: 'endDate',
      reason: 'reason',
    },
    prepare({ productType, productBrand, productName, startDate, endDate, reason }) {
      const title = [productType, productBrand, productName].filter(Boolean).join(' – ') || 'Tillgänglighetsblockering';
      const reasonLabel = reason === 'booked' ? 'Bokad' : reason === 'maintenance' ? 'Service' : 'Blockerad';
      return { title, subtitle: `${startDate ?? ''} – ${endDate ?? ''} · ${reasonLabel}` };
    },
  },
});
