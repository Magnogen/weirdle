// jshint esversion: 11, asi: false
on('load', async () => {
  
  const button = (type) => (line) => {
    let el = document.createElement('div');
    el.classList.add(type);
    
    line.appendChild(el);
    
    return {
      update() {
        el.style.backgroundColor = `rgb(${prop.r}, ${prop.g}, ${prop.b})`;
      },
      element: el,
      setContent(letter) {
        el.innerHTML = letter;
      },
      getContent() {
        return el.innerHTML;
      }
    };
  };
  
  const cell = button('cell');
  const cells =
    [...Array(6)]
      .map(() => {
        const line = document.createElement('div');
        line.classList.add('line');
        
        $('.area').appendChild(line);
        
        return [...Array(5)]
          .map(() => {
            const box = cell(line);
            box.updateSize = (size) => {
              box.element.style.width  = `${size*1.25}px`;
              box.element.style.height = `${size*1.25}px`;
              box.element.style.fontSize = `${size * 2 / 3}px`;
            };
            return box;
          })
        ;
      })
  ;
  
  const key = button('key');
  const keys =
    [
      'qwertyuiop',
      'asdfghjkl',
      '↳zxcvbnm⌫'
    ] .map((letters) => {
        const row = document.createElement('div');
        row.classList.add('row');
        
        $('.keyboard').appendChild(row);
        
        return [...letters]
          .map((letter) => {
            const button = key(row);
            button.setContent(letter);
            if (letter.toUpperCase() == letter.toLowerCase()) {
              button.element.classList.add('filler');
            }
            
            button.updateSize = (size) => {
              button.element.style.width  = `${size}px`;
              button.element.style.height = `${size * 4 / 3}px`;
              button.element.style.fontSize = `${size * 2 / 3}px`;
            };
          
            button.element.on('click', () => {
              trigger('keydown', { key: letter });
            });
            return button;
          })
        ;
      })
      .flat(2)
  ;
  
  // from https://frequencylist.com
  // i found their list more useful than the original
  const commonWords = await fetch('freqlist.txt')
    .then( (res) => res.text() )
    .then( (text) => (
      text
        .split('\n')
        .map((word) => word.replaceAll(/\W/g, '').toLowerCase())
        .filter((word) => word.length == 5)
    ) )
    .then( (words) => (
      [...new Set(words)]
    ) )
  ;
  // from https://gist.github.com/scholtes/94f3c0303ba6a7768b47583aff36654d
  // who got it from the original wordle, https://www.powerlanguage.co.uk/
  const uncommonWords = await fetch('wordle-pickable.txt')
    .then( (res) => res.text() )
    .then( (text) => text.split('\n') )
  ;
  const rareWords = await fetch('wordle-other.txt')
    .then( (res) => res.text() )
    .then( (text) => text.split('\n') )
  ;
  
  const exists = (word) => {
    return commonWords.includes(word) || uncommonWords.includes(word) || rareWords.includes(word);
  };
  
  const pattern = (guess, word) => {
    let result = [...Array(word.length)].map((e) => 0);
    
    let letters = [...word];
    for (const i in guess) {
      const inverted = guess.length - 1 - i;
      if (guess[inverted] != letters[inverted]) continue;
      result[inverted] = 2;
      letters.splice(inverted, 1);
    }
    for (const i in guess) {
      if (result[i] > 0) continue;
      const index = letters.indexOf(guess[i]);
      if (index < 0) continue;
      result[i] = 1;
      letters.splice(index, 1);
    }
    return result;
  };
  
  let guess = 0;
  let letter = 0;
  let difficulty = 'easy';
  const wordlist = {
    easy: commonWords,
    medium: uncommonWords,
    hard: rareWords,
  };
  
  let answer = '';
  const answerElement = $('#answer');
  answerElement.innerHTML = answer;
  answerElement.classList.remove('show');
  // console.log(answer);
  
  const restart = () => {
    guess = 0;
    letter = 0;
    answer = choose(wordlist[difficulty]);
    answerElement.classList.remove('show');
    setTimeout(() => {
      answerElement.innerHTML = answer;
    }, 1000);

    for (const row of cells) {
      for (const cell of row) {
        cell.setContent('');
        cell.element.classList.remove('incorrect', 'in-answer', 'correct');
      }
    }
    for (const key of keys) {
      key.element.classList.remove('incorrect', 'in-answer', 'correct');
      key.part = -1;
    }
  };
  
  let chosenDifficulty = null;
  
  for (const level of Object.keys(wordlist)) {
    const button = document.createElement('div');
    button.classList.add('difficulty');
    button.innerHTML = level;
    button.on('click', () => {
      if (chosenDifficulty) {
        if (chosenDifficulty == button) return;
        chosenDifficulty.classList.remove('selected');
      }
      button.classList.add('selected');
      chosenDifficulty = button;
      difficulty = button.innerHTML;
      restart();
    });
    if (!chosenDifficulty) button.click();
    $('#difficulty-select').appendChild(button);
  }
  
  on('resize', () => {
    const size = Math.min(48, (innerWidth)/10 - 6);
    for (const key of keys) {
      key.updateSize(size);
    }
    
    for (const row of cells) {
      for (const cell of row) {
        cell.updateSize(size);
      }
    }
  }); trigger('resize');
  
  
  
  on('keydown', (event) => {
    if (guess > cells.length-1) return;
    
    if (['Backspace', '⌫'].includes(event.key)) {
      if (letter < 1) return;
      letter--;
      cells[guess][letter].setContent('');
    }
    
    if (['Enter', '↳'].includes(event.key)) {
      if (letter < cells[guess].length) return;
      const word = cells[guess]
          .map(e => e.getContent())
          .join('')
      ;
      if (!exists(word)) {
        const row = cells[guess][0].element.parentElement;
        row.classList.add('non-existant');
        setTimeout(() => {
          row.classList.remove('non-existant');
        }, 1000);
        return;
      }
      
      const parts = pattern(word, answer);
      const mapper = {
        0: 'incorrect',
        1: 'in-answer',
        2: 'correct',
      };
      
      for (const index in parts) {
        const part = parts[index];
        cells[guess][index].element.classList.add(mapper[part]);
        const key = keys.find((key) => key.getContent() == word[index]);
        if ((key.part ?? -1) >= part) continue;
        key.element.classList.remove(mapper[key.part ?? 0]);
        key.part = part;
        key.element.classList.add(mapper[part]);
      }
      
      if (word == answer) {
        cells[guess][0].element.parentElement.classList.add('correct');
        setTimeout(restart, 5000);
        return;
      }
      
      guess++;
      letter = 0;
      
      if (guess > cells.length-1) {
        answerElement.classList.add('show');
        setTimeout(restart, 5000);
      }
    }
    
    if (!'abcdefghijklmnopqrstuvwxyz'.includes(event.key)) return;
    
    if (guess > cells.length-1) return;
    
    if (letter > cells[guess].length-1) return;
    
    cells[guess][letter].setContent(event.key);
    letter++;
  });
  
  
  
  
  
  
  
  
  
});