import { ToyLinesService } from './toyLinesService';
import type { ToyLine, ToyLineFigure } from '../types/toyLine';

export const seedSampleToyLineData = async (adminUserId: string) => {
  try {
    console.log('Seeding sample toy line data...');

    // Create G.I. Joe Classified Series toy line
    const giJoeLineId = await ToyLinesService.create({
      name: 'G.I. Joe Classified Series',
      manufacturer: 'Hasbro',
      startYear: 2020,
      description: 'The highly detailed 6-inch scale action figure line featuring characters from the classic G.I. Joe universe with premium articulation and accessories.',
      category: 'Action Figures',
      isActive: true,
      verified: true,
      isPublic: true,
      source: 'admin',
      createdBy: adminUserId
    });

    console.log('Created G.I. Joe Classified Series toy line:', giJoeLineId);

    // Sample figures for G.I. Joe Classified Series
    const giJoeFigures = [
      {
        name: 'Snake Eyes',
        figureNumber: '#01',
        year: 2020,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Duke',
        figureNumber: '#02',
        year: 2020,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Scarlett',
        figureNumber: '#03',
        year: 2020,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Roadblock',
        figureNumber: '#04',
        year: 2020,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Destro',
        figureNumber: '#05',
        year: 2020,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Cobra Commander',
        figureNumber: '#06',
        year: 2020,
        wave: 'Wave 2',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Gung Ho',
        figureNumber: '#07',
        year: 2021,
        wave: 'Wave 2',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Cobra Trooper',
        figureNumber: '#08',
        year: 2021,
        wave: 'Wave 2',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Flint',
        figureNumber: '#09',
        year: 2021,
        wave: 'Wave 3',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Lady Jaye',
        figureNumber: '#10',
        year: 2021,
        wave: 'Wave 3',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Cobra Viper',
        figureNumber: '#11',
        year: 2021,
        wave: 'Wave 3',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Storm Shadow',
        figureNumber: '#12',
        year: 2021,
        wave: 'Wave 4',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Zartan',
        figureNumber: '#13',
        year: 2022,
        wave: 'Wave 4',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Baroness',
        figureNumber: '#14',
        year: 2022,
        wave: 'Wave 5',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Firefly',
        figureNumber: '#15',
        year: 2022,
        wave: 'Wave 5',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Beach Head',
        figureNumber: '#16',
        year: 2022,
        wave: 'Wave 6',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Shipwreck',
        figureNumber: '#17',
        year: 2023,
        wave: 'Wave 6',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Spirit',
        figureNumber: '#18',
        year: 2023,
        wave: 'Wave 7',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Cobra Eel',
        figureNumber: '#19',
        year: 2023,
        wave: 'Wave 7',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Alpine',
        figureNumber: '#20',
        year: 2024,
        wave: 'Wave 8',
        manufacturer: 'Hasbro',
        category: 'Action Figures',
        size: '6 inch',
        source: 'admin' as const,
        createdBy: adminUserId
      }
    ];

    // Add all figures to the toy line
    console.log(`Adding ${giJoeFigures.length} figures to G.I. Joe Classified Series...`);
    for (const figure of giJoeFigures) {
      await ToyLinesService.addFigureToLine(giJoeLineId, figure);
      console.log(`Added ${figure.name} (${figure.figureNumber})`);
    }

    // Create Transformers toy line
    const transformersLineId = await ToyLinesService.create({
      name: 'Transformers Studio Series',
      manufacturer: 'Hasbro',
      startYear: 2018,
      description: 'Movie-inspired Transformers featuring premium detail and multiple points of articulation.',
      category: 'Transformers',
      isActive: true,
      verified: true,
      isPublic: true,
      source: 'admin',
      createdBy: adminUserId
    });

    console.log('Created Transformers Studio Series toy line:', transformersLineId);

    // Sample Transformers figures
    const transformersFigures = [
      {
        name: 'Optimus Prime (Bumblebee Movie)',
        figureNumber: '#01',
        year: 2018,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Transformers',
        size: 'Voyager Class',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Bumblebee (Bumblebee Movie)',
        figureNumber: '#18',
        year: 2018,
        wave: 'Wave 1',
        manufacturer: 'Hasbro',
        category: 'Transformers',
        size: 'Deluxe Class',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Megatron (The Last Knight)',
        figureNumber: '#13',
        year: 2019,
        wave: 'Wave 2',
        manufacturer: 'Hasbro',
        category: 'Transformers',
        size: 'Leader Class',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Starscream (Dark of the Moon)',
        figureNumber: '#06',
        year: 2019,
        wave: 'Wave 2',
        manufacturer: 'Hasbro',
        category: 'Transformers',
        size: 'Voyager Class',
        source: 'admin' as const,
        createdBy: adminUserId
      },
      {
        name: 'Jazz (2007 Movie)',
        figureNumber: '#11',
        year: 2020,
        wave: 'Wave 3',
        manufacturer: 'Hasbro',
        category: 'Transformers',
        size: 'Deluxe Class',
        source: 'admin' as const,
        createdBy: adminUserId
      }
    ];

    // Add Transformers figures
    console.log(`Adding ${transformersFigures.length} figures to Transformers Studio Series...`);
    for (const figure of transformersFigures) {
      await ToyLinesService.addFigureToLine(transformersLineId, figure);
      console.log(`Added ${figure.name} (${figure.figureNumber})`);
    }

    console.log('Sample toy line data seeding completed!');
    console.log(`Created 2 toy lines with ${giJoeFigures.length + transformersFigures.length} total figures`);

    return {
      giJoeLineId,
      transformersLineId,
      totalFigures: giJoeFigures.length + transformersFigures.length
    };

  } catch (error) {
    console.error('Error seeding toy line data:', error);
    throw error;
  }
};