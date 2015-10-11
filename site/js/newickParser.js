var NewickParser = function(){
    
    this.newickNodes = [];
    
    var rawText = primatesString;
    
    this.parseString = function(){
        
        var currentLevel = 1;
        var currentString;
        var runningData = [];
        
        for(var i = 0; i < rawText.length; i++){
            var currentChar = rawText.charAt(i);
            
            if(i > 0){
                var lastChar = rawText.charAt(i-1);
                
                if((currentChar == ',' || currentChar == ')') && lastChar == ')'){
                    var combinationNode = new NewickNode(currentLevel, "");
                    this.newickNodes.push(combinationNode);
                    
                    var j = this.newickNodes.length-2;
                    
                    while(this.newickNodes[j].level > combinationNode.level){
                        if(this.newickNodes[j].level == combinationNode.level+1){
                            if(combinationNode.displayString!=""){
                                combinationNode.displayString = combinationNode.displayString.concat(' + ');
                            }
                            combinationNode.displayString = combinationNode.displayString.concat(this.newickNodes[j].displayString);
                        }
                        j--;
                    }
                    var testString = combinationNode.displayString.replace('...','');
                    var testArray = testString.split('+');
                    if(testArray.length > 3){
                        testArray = testArray.splice(0, 3);
                        combinationNode.displayString = testArray.join('+');
                        combinationNode.displayString = combinationNode.displayString.concat('...');
                    }
                }
                
                if(currentChar != '(' && currentChar != ')' && currentChar != ',' && currentChar != ';'){
                    runningData.push(currentChar);
                }else if (runningData.length > 0){
                    currentString = runningData.join(""); 
                    var currentNode = new NewickNode(currentLevel, currentString);
                    this.newickNodes.push(currentNode);
                    
                    runningData = [];
                }
                
                if(currentChar == '('){
                    currentLevel++;
                }
                if(currentChar == ')'){
                    currentLevel--;
                }
            }            
        }
        
        for(var i = this.newickNodes.length-1; i >= 0; i--){
            if(i < this.newickNodes.length-1){
                var currentNode = this.newickNodes[i];
                var j = i;
                
                while(currentNode.level <= this.newickNodes[j].level){
                    j++;
                }
                
                currentNode.parentNode = this.newickNodes[j];
                currentNode.parentNode.childNodes.push(currentNode);
            }
        }
    };
};

var NewickNode = function(level, string){
    this.parentNode;
    this.childNodes = [];
    
    this.level = level;
    
    var rawString = string;    
    var tempArray = rawString.split('_');
    tempArray = tempArray.slice(0, tempArray.length-1);    
    this.displayString = tempArray.join(" ");    

};