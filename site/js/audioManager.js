var audioContext = new AudioContext;

var masterGain = audioContext.createGain();
masterGain.connect(audioContext.destination);

var testOsc = audioContext.createOscillator();
testOsc.type="sine";
testOsc.frequency.value = 440.0;
testOsc.start();

testOscGainNode = audioContext.createGain();
testOscGainNode.gain.value = 0.5;
testOsc.connect(testOscGainNode);
//testOscGainNode.connect(masterGain);

var AudioNode = function(){
    this.vco = audioContext.createOscillator();
    this.vco.type = "sine";
    
    var noteValue = Math.floor((Math.random()*48+40)); 
    noteValue = convertToKey(noteValue);
    var freqValue = Math.pow(2, (noteValue-69)/12) * 440;    
    console.log("Note: " + noteValue + ", " + "Frequency: " + freqValue);
    
    this.vco.frequency.value = freqValue;
    this.vco.start();
    
    this.vca = audioContext.createGain();
    this.vca.gain.value = 0.0;
    
    this.vco.connect(this.vca);
    
    this.vca.connect(masterGain);
};

function convertToKey(noteToConvert){
    var checkedValue = noteToConvert/12;
    checkedValue = checkedValue - Math.floor(checkedValue);
    checkedValue = checkedValue.toPrecision(3);
    
    var convertedNote = noteToConvert;
    
    if(checkedValue.match(/^(0.0833|0.250|0.500|0.667|0.833)$/)){
        convertedNote++;
    }
    return convertedNote;
}