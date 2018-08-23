//global input variable named 'parsedInput'

const inputField = document.getElementById('input-field')
const inputSubmit = document.getElementById('input-submit')

//onclick submit
inputSubmit.addEventListener('click',submitInput)
//enter keypress submit
document.addEventListener('keydown',function(key){
  if(key.keyCode === 13){
  submitInput();
  } 
})

function submitInput(){
  let isJSON;
  try{
    isJSON = JSON.parse(inputField.value);
  }
  catch(err){
    alert('Valid JSON required for input')
  }
  if(isJSON){
    if(typeof isJSON === 'object'){
      //global variable set
      global.parsedInput = isJSON;
      console.log(parsedInput);
    }
    else{
      alert('Valid JSON required for input');
    }
  }
}