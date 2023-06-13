const url = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const result = document.getElementById("result");
const btn = document.getElementById("search-btn");
btn.addEventListener("click", () => {
  const inpWord = document.getElementById("inp-word").value;
  fetch(`${url}${inpWord}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      result.innerHTML = `
<div class="word">
        <h3>${inpWord}</h3>
    </div>
    <p class="word-meaning">
    ${data[0].meanings[0].definitions[0].definition}
    </p>
    <p class="word-example">
    "${data[0].meanings[0].definitions[0].example ||""}"
    </p>`;
    });
});
