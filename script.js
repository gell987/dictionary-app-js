// ULTIMATE WORD LOOKUP ENGINE - Multi-API Data Aggregation
const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const DATAMUSE_API = "https://api.datamuse.com/words";

const result = document.getElementById("result");
const btn = document.getElementById("search-btn");
const inpWord = document.getElementById("inp-word");

// Enable Enter key to search
inpWord.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    btn.click();
  }
});

btn.addEventListener("click", async () => {
  const word = inpWord.value.trim().toLowerCase();

  if (!word) {
    result.innerHTML = '<div class="error">Please enter a word to search.</div>';
    return;
  }

  // Show loading state
  result.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <h2>Gathering comprehensive data for "${word}"...</h2>
      <p>Querying multiple dictionaries and linguistic databases...</p>
    </div>
  `;

  try {
    // Fetch from ALL sources simultaneously for maximum speed
    const [dictionaryData, synonymsData, rhymesData, relatedData, frequencyData, soundsLikeData] = await Promise.allSettled([
      fetch(`${DICTIONARY_API}${word}`).then(r => r.json()),
      fetch(`${DATAMUSE_API}?rel_syn=${word}&max=50`).then(r => r.json()), // Synonyms
      fetch(`${DATAMUSE_API}?rel_rhy=${word}&max=30`).then(r => r.json()), // Rhymes
      fetch(`${DATAMUSE_API}?ml=${word}&max=50`).then(r => r.json()), // Meaning-like
      fetch(`${DATAMUSE_API}?sp=${word}&md=f&max=1`).then(r => r.json()), // Frequency
      fetch(`${DATAMUSE_API}?sl=${word}&max=30`).then(r => r.json()) // Sounds like
    ]);

    // Process the primary dictionary data
    if (dictionaryData.status === 'rejected' || dictionaryData.value.title === "No Definitions Found") {
      throw new Error("Word not found");
    }

    const wordData = dictionaryData.value[0];
    const synonyms = synonymsData.status === 'fulfilled' ? synonymsData.value : [];
    const rhymes = rhymesData.status === 'fulfilled' ? rhymesData.value : [];
    const related = relatedData.status === 'fulfilled' ? relatedData.value : [];
    const frequency = frequencyData.status === 'fulfilled' && frequencyData.value[0] ? frequencyData.value[0] : null;
    const soundsLike = soundsLikeData.status === 'fulfilled' ? soundsLikeData.value : [];

    // Build comprehensive display
    displayWordData(word, wordData, {
      synonyms,
      rhymes,
      related,
      frequency,
      soundsLike
    });

  } catch (error) {
    result.innerHTML = `
      <div class="error">
        <h2>❌ Word Not Found</h2>
        <p>Could not find comprehensive data for "<strong>${word}</strong>"</p>
        <p class="error-detail">The word may be misspelled or not available in our databases.</p>
      </div>
    `;
  }
});

function displayWordData(word, data, additional) {
  let html = `
    <div class="word-header">
      <h1 class="word-title">${data.word || word}</h1>
      ${generatePhonetics(data.phonetics)}
    </div>
  `;

  // Word frequency indicator
  if (additional.frequency && additional.frequency.tags && additional.frequency.tags.includes('f:')) {
    const freqTag = additional.frequency.tags.find(t => t.startsWith('f:'));
    const freqValue = parseFloat(freqTag.split(':')[1]);
    html += generateFrequencyBar(freqValue);
  }

  // Origin/Etymology
  if (data.origin) {
    html += `
      <div class="section etymology-section">
        <h2 class="section-title">📜 Etymology & Origin</h2>
        <div class="etymology-content">${data.origin}</div>
      </div>
    `;
  }

  // ALL MEANINGS organized by part of speech
  html += '<div class="meanings-section">';
  data.meanings.forEach((meaning, idx) => {
    html += `
      <div class="meaning-block">
        <div class="part-of-speech">
          <span class="pos-badge">${meaning.partOfSpeech}</span>
        </div>
    `;

    // All definitions for this part of speech
    meaning.definitions.forEach((def, defIdx) => {
      html += `
        <div class="definition-item">
          <div class="definition-number">${defIdx + 1}.</div>
          <div class="definition-content">
            <p class="definition-text">${def.definition}</p>
            ${def.example ? `<p class="example-text">💬 <em>"${def.example}"</em></p>` : ''}
            ${def.synonyms && def.synonyms.length > 0 ?
              `<p class="inline-synonyms">↗️ Synonyms: ${def.synonyms.map(s => `<span class="tag">${s}</span>`).join(' ')}</p>`
              : ''}
            ${def.antonyms && def.antonyms.length > 0 ?
              `<p class="inline-antonyms">↘️ Antonyms: ${def.antonyms.map(a => `<span class="tag antonym-tag">${a}</span>`).join(' ')}</p>`
              : ''}
          </div>
        </div>
      `;
    });

    // Meaning-level synonyms and antonyms
    if (meaning.synonyms && meaning.synonyms.length > 0) {
      html += `<div class="meaning-synonyms">🔄 Related: ${meaning.synonyms.slice(0, 10).map(s => `<span class="tag">${s}</span>`).join(' ')}</div>`;
    }
    if (meaning.antonyms && meaning.antonyms.length > 0) {
      html += `<div class="meaning-antonyms">⚡ Opposites: ${meaning.antonyms.slice(0, 10).map(a => `<span class="tag antonym-tag">${a}</span>`).join(' ')}</div>`;
    }

    html += '</div>'; // Close meaning-block
  });
  html += '</div>'; // Close meanings-section

  // COMPREHENSIVE WORD RELATIONSHIPS from Datamuse
  html += '<div class="relationships-grid">';

  // Synonyms
  if (additional.synonyms.length > 0) {
    html += generateRelationshipSection(
      '🔄 Synonyms & Similar Words',
      additional.synonyms.slice(0, 30),
      'synonym-tag'
    );
  }

  // Related words
  if (additional.related.length > 0) {
    html += generateRelationshipSection(
      '🔗 Related Words & Concepts',
      additional.related.filter(w => w.word !== word).slice(0, 30),
      'related-tag'
    );
  }

  // Rhymes
  if (additional.rhymes.length > 0) {
    html += generateRelationshipSection(
      '🎵 Rhymes',
      additional.rhymes.slice(0, 25),
      'rhyme-tag'
    );
  }

  // Sounds like
  if (additional.soundsLike.length > 0) {
    html += generateRelationshipSection(
      '👂 Sounds Like',
      additional.soundsLike.filter(w => w.word !== word).slice(0, 20),
      'sounds-tag'
    );
  }

  html += '</div>'; // Close relationships-grid

  // Source attribution
  html += `
    <div class="attribution">
      <p>📚 Data aggregated from: Free Dictionary API, Datamuse API</p>
      <p class="api-note">Powered by multiple linguistic databases for comprehensive word analysis</p>
    </div>
  `;

  result.innerHTML = html;

  // Add click handlers for audio buttons
  document.querySelectorAll('.audio-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const audioUrl = this.dataset.audio;
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.log('Audio playback failed:', e));
    });
  });
}

function generatePhonetics(phonetics) {
  if (!phonetics || phonetics.length === 0) return '';

  let html = '<div class="phonetics-section">';

  phonetics.forEach(phonetic => {
    if (phonetic.text || phonetic.audio) {
      html += '<div class="phonetic-item">';

      if (phonetic.text) {
        html += `<span class="phonetic-text">/${phonetic.text}/</span>`;
      }

      if (phonetic.audio) {
        html += `<button class="audio-btn" data-audio="${phonetic.audio}" title="Play pronunciation">🔊 Play</button>`;
      }

      html += '</div>';
    }
  });

  html += '</div>';
  return html;
}

function generateFrequencyBar(frequency) {
  // Frequency is typically 0-100+, normalize to percentage
  const normalizedFreq = Math.min(frequency * 2, 100);
  const freqLevel = normalizedFreq > 70 ? 'Very Common' :
                    normalizedFreq > 40 ? 'Common' :
                    normalizedFreq > 15 ? 'Moderate' : 'Rare';

  return `
    <div class="frequency-section">
      <h3 class="frequency-title">📊 Usage Frequency: <span class="freq-label">${freqLevel}</span></h3>
      <div class="frequency-bar">
        <div class="frequency-fill" style="width: ${normalizedFreq}%"></div>
      </div>
      <p class="frequency-note">Based on modern English corpus analysis</p>
    </div>
  `;
}

function generateRelationshipSection(title, words, tagClass) {
  if (!words || words.length === 0) return '';

  return `
    <div class="relationship-section">
      <h3 class="relationship-title">${title}</h3>
      <div class="tags-container">
        ${words.map(w => {
          const wordText = typeof w === 'string' ? w : w.word;
          const score = typeof w === 'object' && w.score ? ` (${w.score})` : '';
          return `<span class="tag ${tagClass}" title="Relevance${score}">${wordText}</span>`;
        }).join('')}
      </div>
    </div>
  `;
}
