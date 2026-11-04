import type { Locales } from '@engine/i18n';

export const locales: Locales = {
  ru: {
    'menu.play': 'Играть',
    'menu.best': 'Рекорд: {n}',
    'menu.sound.on': 'Звук: вкл',
    'menu.sound.off': 'Звук: выкл',
    'game.score': 'Очки: {n}',
    'game.time': '{n} с',
    'over.title': 'Время вышло!',
    'over.score': 'Ваш счёт: {n}',
    'over.again': 'Ещё раз',
    'over.double': 'Удвоить очки (реклама)',
    'over.menu': 'В меню',
  },
  en: {
    'menu.play': 'Play',
    'menu.best': 'Best: {n}',
    'menu.sound.on': 'Sound: on',
    'menu.sound.off': 'Sound: off',
    'game.score': 'Score: {n}',
    'game.time': '{n} s',
    'over.title': "Time's up!",
    'over.score': 'Your score: {n}',
    'over.again': 'Play again',
    'over.double': 'Double score (ad)',
    'over.menu': 'Menu',
  },
};
