const Letter = ({letters, index, currentLetterIndex, jumpToNextLetter, addAttempt, IS_CASE_SENSITIVE}) => {

  const lastAttempt = letters[index].attempts[letters[index].attempts.length - 1];
  const letter = letters[index].letter;
  const isFocused = index === currentLetterIndex;
  const isDone = lastAttempt && ((IS_CASE_SENSITIVE && lastAttempt === letter) || (!IS_CASE_SENSITIVE && lastAttempt.toLowerCase() === letter.toLowerCase()));

  const clearInput = () => {
    document.getElementsByTagName("input")[0].value = "";
  }

  const handleChange = (event) => {
    const input = event.target.value;
    clearInput();
    addAttempt(input);

    if ((IS_CASE_SENSITIVE && input === letter ) || (!IS_CASE_SENSITIVE && input.toLowerCase() === letter.toLowerCase())) {
      console.log("Good job!");
      jumpToNextLetter();
      
    } else {
      console.log("Try again");
    }
  }

  return (
    <div className="letter" data-done={isDone} data-focused={isFocused}>
      <div>{letter}</div>
      {isFocused ? 
        <input type="text" autoFocus onChange={handleChange} onFocus={clearInput}/>
      : ""}
    </div>
  );

}

export default Letter;