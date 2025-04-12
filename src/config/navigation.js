export const navigation = [

    {
      name: 'Label',
      href: '/posts',
      isDynamic: true, // Menandai bahwa children akan diisi secara dinamis
      children: [] // Akan diisi dari API
    },

    {
      name: 'Gema Spiritualitas',
      href: '/gema-spiritualitas',
      children: [
        { name: 'Artikel', href: '/gema-spiritualitas/artikel' },
        { name: 'Puisi', href: '/gema-spiritualitas/puisi' },
        { name: 'Anekdot', href: '/gema-spiritualitas/anekdot' },
        { name: 'Kasih', href: '/gema-spiritualitas/kasih' },
      ],
    },
    { name: 'Galeri', href: '#' },
    { name: 'Spotlight', href: '/spotlight' },
  ];