// Seed data for Community Database
// Pre-populated with popular action figures across multiple lines

export interface SeedFigure {
  name: string;
  manufacturer: string;
  year: string;
  productLine: string;
  subProductLine?: string;
  category: string;
  images: string[];
  averageValue: number;
}

export const seedFigures: SeedFigure[] = [
  // ==================== G.I. JOE (1982-1994) ====================

  // Wave 1 - 1982
  { name: 'Snake Eyes', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2638/84696.jpg'], averageValue: 35 },
  { name: 'Scarlett', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2612/84589.jpg'], averageValue: 25 },
  { name: 'Stalker', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2649/84736.jpg'], averageValue: 20 },
  { name: 'Rock n Roll', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2608/84570.jpg'], averageValue: 18 },
  { name: 'Grunt', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2567/84404.jpg'], averageValue: 15 },
  { name: 'Short-Fuze', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2632/84658.jpg'], averageValue: 15 },
  { name: 'Breaker', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2535/84263.jpg'], averageValue: 15 },
  { name: 'Flash', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2554/84343.jpg'], averageValue: 15 },
  { name: 'Zap', manufacturer: 'Hasbro', year: '1982', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2683/84956.jpg'], averageValue: 15 },

  // Wave 2 - 1983
  { name: 'Duke', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2548/84318.jpg'], averageValue: 22 },
  { name: 'Cobra Commander', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2538/84278.jpg'], averageValue: 30 },
  { name: 'Destro', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2543/84296.jpg'], averageValue: 28 },
  { name: 'Major Bludd', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2586/84487.jpg'], averageValue: 25 },
  { name: 'Airborne', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2521/84196.jpg'], averageValue: 18 },
  { name: 'Doc', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2544/84301.jpg'], averageValue: 18 },
  { name: 'Gung-Ho', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2568/84411.jpg'], averageValue: 20 },
  { name: 'Snow Job', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2641/84694.jpg'], averageValue: 18 },
  { name: 'Torpedo', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2661/84823.jpg'], averageValue: 18 },
  { name: 'Tripwire', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2664/84837.jpg'], averageValue: 18 },
  { name: 'Wild Bill', manufacturer: 'Hasbro', year: '1983', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2678/84916.jpg'], averageValue: 18 },

  // Wave 3 - 1984
  { name: 'Storm Shadow', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2650/84741.jpg'], averageValue: 45 },
  { name: 'Firefly', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2555/84347.jpg'], averageValue: 40 },
  { name: 'Zartan', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2684/84961.jpg'], averageValue: 35 },
  { name: 'Spirit', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2644/84709.jpg'], averageValue: 22 },
  { name: 'Mutt', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2598/84538.jpg'], averageValue: 20 },
  { name: 'Roadblock', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2609/84574.jpg'], averageValue: 22 },
  { name: 'Recondo', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2606/84562.jpg'], averageValue: 18 },
  { name: 'Blowtorch', manufacturer: 'Hasbro', year: '1984', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2532/84250.jpg'], averageValue: 18 },

  // Wave 4 - 1985
  { name: 'Flint', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2557/84356.jpg'], averageValue: 20 },
  { name: 'Lady Jaye', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2582/84467.jpg'], averageValue: 25 },
  { name: 'Tomax', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2659/84813.jpg'], averageValue: 25 },
  { name: 'Xamot', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2680/84932.jpg'], averageValue: 25 },
  { name: 'Crimson Guard', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2541/84287.jpg'], averageValue: 22 },
  { name: 'Quick Kick', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2605/84559.jpg'], averageValue: 18 },
  { name: 'Shipwreck', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2630/84651.jpg'], averageValue: 18 },
  { name: 'Bazooka', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2529/84236.jpg'], averageValue: 18 },
  { name: 'Alpine', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2523/84206.jpg'], averageValue: 18 },
  { name: 'Footloose', manufacturer: 'Hasbro', year: '1985', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2560/84367.jpg'], averageValue: 18 },

  // Wave 5 - 1986
  { name: 'Serpentor', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2625/84625.jpg'], averageValue: 30 },
  { name: 'Hawk', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2571/84423.jpg'], averageValue: 18 },
  { name: 'Leatherneck', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2583/84472.jpg'], averageValue: 18 },
  { name: 'Beach Head', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2530/84239.jpg'], averageValue: 20 },
  { name: 'Dial-Tone', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2542/84290.jpg'], averageValue: 15 },
  { name: 'Wet-Suit', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2676/84907.jpg'], averageValue: 15 },
  { name: 'Mainframe', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2587/84492.jpg'], averageValue: 15 },
  { name: 'Lifeline', manufacturer: 'Hasbro', year: '1986', productLine: 'G.I. Joe: A Real American Hero', category: 'Loose', images: ['https://www.yojoe.com/images/resize/w/MAX/imagestore/2584/84477.jpg'], averageValue: 15 },

  // ==================== MARVEL LEGENDS ====================

  { name: 'Spider-Man (Pizza Spidey)', manufacturer: 'Hasbro', year: '2017', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Wolverine (Vintage)', manufacturer: 'Hasbro', year: '2019', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Iron Man (Modular Armor)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Captain America (Worthy)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 40 },
  { name: 'Deadpool (X-Force)', manufacturer: 'Hasbro', year: '2018', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Venom (Monster Venom)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 45 },
  { name: 'Carnage (Monster Venom Wave)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 38 },
  { name: 'Thor (80th Anniversary)', manufacturer: 'Hasbro', year: '2019', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Hulk (Vintage)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Doctor Doom (Super Villains)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 32 },
  { name: 'Green Goblin (Retro)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Black Panther (Chadwick Boseman)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 50 },
  { name: 'Scarlet Witch (Disney+)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Vision (Disney+)', manufacturer: 'Hasbro', year: '2021', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Thanos (Armored)', manufacturer: 'Hasbro', year: '2019', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 55 },
  { name: 'Iron Spider', manufacturer: 'Hasbro', year: '2018', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 32 },
  { name: 'Star-Lord (Guardians)', manufacturer: 'Hasbro', year: '2017', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Gamora (Guardians)', manufacturer: 'Hasbro', year: '2017', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Rocket Raccoon (Guardians)', manufacturer: 'Hasbro', year: '2017', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 20 },
  { name: 'Groot (Guardians)', manufacturer: 'Hasbro', year: '2017', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Cyclops (Jim Lee)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Storm (Vintage)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Magneto (20th Century Fox)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Mystique (X-Men)', manufacturer: 'Hasbro', year: '2019', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Juggernaut (Deluxe)', manufacturer: 'Hasbro', year: '2020', productLine: 'Marvel Legends', category: 'MOC', images: [], averageValue: 45 },

  // ==================== STAR WARS (VINTAGE) ====================

  { name: 'Darth Vader', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Luke Skywalker (Farmboy)', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Princess Leia Organa', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'Han Solo', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Chewbacca', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Obi-Wan Kenobi', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'C-3PO', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'R2-D2', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Stormtrooper', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 38 },
  { name: 'Boba Fett', manufacturer: 'Kenner', year: '1979', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 80 },
  { name: 'Yoda', manufacturer: 'Kenner', year: '1980', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Emperor Palpatine', manufacturer: 'Kenner', year: '1984', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 55 },
  { name: 'Lando Calrissian', manufacturer: 'Kenner', year: '1980', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 30 },
  { name: 'Bossk', manufacturer: 'Kenner', year: '1980', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'IG-88', manufacturer: 'Kenner', year: '1980', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 55 },
  { name: 'Greedo', manufacturer: 'Kenner', year: '1979', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 38 },
  { name: 'Hammerhead', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Walrus Man', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Jawa', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 30 },
  { name: 'Sand People (Tusken Raider)', manufacturer: 'Kenner', year: '1978', productLine: 'Star Wars (Vintage)', category: 'Loose', images: [], averageValue: 35 },

  // ==================== STAR WARS (BLACK SERIES) ====================

  { name: 'Darth Vader (Black Series)', manufacturer: 'Hasbro', year: '2013', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 40 },
  { name: 'Stormtrooper (Black Series)', manufacturer: 'Hasbro', year: '2013', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Boba Fett (Black Series)', manufacturer: 'Hasbro', year: '2013', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 50 },
  { name: 'Mandalorian (Beskar)', manufacturer: 'Hasbro', year: '2020', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 45 },
  { name: 'Grogu (The Child)', manufacturer: 'Hasbro', year: '2020', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Ahsoka Tano (Clone Wars)', manufacturer: 'Hasbro', year: '2020', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Captain Rex', manufacturer: 'Hasbro', year: '2020', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 45 },
  { name: 'Darth Revan', manufacturer: 'Hasbro', year: '2019', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 65 },
  { name: 'Darth Maul (Sith Apprentice)', manufacturer: 'Hasbro', year: '2019', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Luke Skywalker (Jedi Knight)', manufacturer: 'Hasbro', year: '2019', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 30 },
  { name: 'Rey (Rise of Skywalker)', manufacturer: 'Hasbro', year: '2019', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Kylo Ren (Supreme Leader)', manufacturer: 'Hasbro', year: '2019', productLine: 'Star Wars: Black Series', category: 'MOC', images: [], averageValue: 25 },

  // ==================== MASTERS OF THE UNIVERSE (VINTAGE) ====================

  { name: 'He-Man', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Skeletor', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Man-At-Arms', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Teela', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'Beast Man', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Mer-Man', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'Stratos', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Battle Cat', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Evil-Lyn', manufacturer: 'Mattel', year: '1983', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Tri-Klops', manufacturer: 'Mattel', year: '1983', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Trap Jaw', manufacturer: 'Mattel', year: '1983', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 45 },
  { name: 'Zodac', manufacturer: 'Mattel', year: '1982', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 38 },
  { name: 'Ram Man', manufacturer: 'Mattel', year: '1983', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'Man-E-Faces', manufacturer: 'Mattel', year: '1983', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 38 },
  { name: 'Orko', manufacturer: 'Mattel', year: '1984', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Hordak', manufacturer: 'Mattel', year: '1985', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 60 },
  { name: 'She-Ra', manufacturer: 'Mattel', year: '1984', productLine: 'Masters of the Universe (Vintage)', category: 'Loose', images: [], averageValue: 55 },

  // ==================== MASTERS OF THE UNIVERSE (ORIGINS) ====================

  { name: 'He-Man (Origins)', manufacturer: 'Mattel', year: '2020', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 22 },
  { name: 'Skeletor (Origins)', manufacturer: 'Mattel', year: '2020', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 22 },
  { name: 'Beast Man (Origins)', manufacturer: 'Mattel', year: '2020', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 18 },
  { name: 'Evil-Lyn (Origins)', manufacturer: 'Mattel', year: '2020', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 20 },
  { name: 'Trap Jaw (Origins)', manufacturer: 'Mattel', year: '2021', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 20 },
  { name: 'Mer-Man (Origins)', manufacturer: 'Mattel', year: '2021', productLine: 'Masters of the Universe Origins', category: 'MOC', images: [], averageValue: 18 },

  // ==================== DC MULTIVERSE ====================

  { name: 'Batman (Dark Knight)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Superman (Action Comics)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Wonder Woman (1984)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },
  { name: 'The Flash (Justice League)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 22 },
  { name: 'Aquaman (King of Atlantis)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 22 },
  { name: 'Joker (Three Jokers)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Harley Quinn (Birds of Prey)', manufacturer: 'McFarlane Toys', year: '2020', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Nightwing (Better Than Batman)', manufacturer: 'McFarlane Toys', year: '2021', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Red Hood (Outlaw)', manufacturer: 'McFarlane Toys', year: '2021', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },
  { name: 'Darkseid (Mega)', manufacturer: 'McFarlane Toys', year: '2021', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 50 },
  { name: 'Batman (Batsuit)', manufacturer: 'McFarlane Toys', year: '2022', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Cyborg Superman', manufacturer: 'McFarlane Toys', year: '2021', productLine: 'DC Multiverse', category: 'MOC', images: [], averageValue: 25 },

  // ==================== WWE ====================

  { name: 'The Rock (Attitude Era)', manufacturer: 'Mattel', year: '2019', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Stone Cold Steve Austin', manufacturer: 'Mattel', year: '2018', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 35 },
  { name: 'John Cena (You Cant See Me)', manufacturer: 'Mattel', year: '2017', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 28 },
  { name: 'Undertaker (Ministry)', manufacturer: 'Mattel', year: '2019', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 40 },
  { name: 'Bret Hart (Hitman)', manufacturer: 'Mattel', year: '2018', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 32 },
  { name: 'Shawn Michaels (Heartbreak Kid)', manufacturer: 'Mattel', year: '2018', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 32 },
  { name: 'Hulk Hogan (Hulkamania)', manufacturer: 'Mattel', year: '2017', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 35 },
  { name: 'Randy Savage (Macho Man)', manufacturer: 'Mattel', year: '2018', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 38 },
  { name: 'Ric Flair (Nature Boy)', manufacturer: 'Mattel', year: '2019', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 30 },
  { name: 'CM Punk (Straight Edge)', manufacturer: 'Mattel', year: '2020', productLine: 'WWE Elite', category: 'MOC', images: [], averageValue: 45 },

  // ==================== TEENAGE MUTANT NINJA TURTLES (VINTAGE) ====================

  { name: 'Leonardo', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Donatello', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Raphael', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Michelangelo', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Shredder', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 40 },
  { name: 'April O\'Neil', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Splinter', manufacturer: 'Playmates', year: '1988', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 38 },
  { name: 'Bebop', manufacturer: 'Playmates', year: '1989', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Rocksteady', manufacturer: 'Playmates', year: '1989', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Casey Jones', manufacturer: 'Playmates', year: '1989', productLine: 'Teenage Mutant Ninja Turtles (Vintage)', category: 'Loose', images: [], averageValue: 40 },

  // ==================== TRANSFORMERS (G1) ====================

  { name: 'Optimus Prime (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 120 },
  { name: 'Megatron (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 100 },
  { name: 'Starscream (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 75 },
  { name: 'Soundwave (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 85 },
  { name: 'Bumblebee (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 55 },
  { name: 'Jazz (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 60 },
  { name: 'Prowl (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 55 },
  { name: 'Ironhide (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Ratchet (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 50 },
  { name: 'Wheeljack (G1)', manufacturer: 'Hasbro', year: '1984', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 48 },
  { name: 'Grimlock (G1)', manufacturer: 'Hasbro', year: '1985', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 90 },
  { name: 'Hot Rod (G1)', manufacturer: 'Hasbro', year: '1986', productLine: 'Transformers (G1)', category: 'Loose', images: [], averageValue: 70 },

  // ==================== POWER RANGERS ====================

  { name: 'Red Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 30 },
  { name: 'Blue Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 25 },
  { name: 'Black Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 25 },
  { name: 'Yellow Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 25 },
  { name: 'Pink Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 28 },
  { name: 'Green Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1994', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 40 },
  { name: 'White Ranger (Mighty Morphin)', manufacturer: 'Bandai', year: '1994', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 35 },
  { name: 'Lord Zedd', manufacturer: 'Bandai', year: '1994', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 30 },
  { name: 'Rita Repulsa', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 28 },
  { name: 'Goldar', manufacturer: 'Bandai', year: '1993', productLine: 'Mighty Morphin Power Rangers', category: 'Loose', images: [], averageValue: 25 },
];

/**
 * Get seed figures by product line
 */
export function getSeedFiguresByLine(productLine: string): SeedFigure[] {
  return seedFigures.filter(fig => fig.productLine === productLine);
}

/**
 * Get all unique product lines
 */
export function getAllProductLines(): string[] {
  const lines = new Set(seedFigures.map(fig => fig.productLine));
  return Array.from(lines).sort();
}

/**
 * Get statistics about seed data
 */
export function getSeedStats() {
  const byLine = new Map<string, number>();
  const byManufacturer = new Map<string, number>();

  seedFigures.forEach(fig => {
    byLine.set(fig.productLine, (byLine.get(fig.productLine) || 0) + 1);
    byManufacturer.set(fig.manufacturer, (byManufacturer.get(fig.manufacturer) || 0) + 1);
  });

  return {
    total: seedFigures.length,
    productLines: byLine.size,
    manufacturers: byManufacturer.size,
    byLine: Object.fromEntries(byLine),
    byManufacturer: Object.fromEntries(byManufacturer),
  };
}
