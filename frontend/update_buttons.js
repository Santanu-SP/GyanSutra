const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  if (file.includes('AnimatedButton.jsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<button') || content.includes('</button>')) {
    // Replace <button with <AnimatedButton and </button> with </AnimatedButton>
    let newContent = content.replace(/<button/g, '<AnimatedButton').replace(/<\/button>/g, '</AnimatedButton>');
    
    // Check if AnimatedButton is imported
    if (!newContent.includes('AnimatedButton')) {
      return; 
    }
    
    if (!newContent.includes('import AnimatedButton')) {
      // Calculate relative path to src/components/AnimatedButton
      const fileDir = path.dirname(file);
      const componentsDir = path.join(srcDir, 'components');
      let relativePath = path.relative(fileDir, componentsDir);
      if (relativePath === '') relativePath = '.';
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      
      const importStatement = `import AnimatedButton from '${relativePath}/AnimatedButton';\n`;
      
      // Insert after the last import statement
      const importRegex = /import .* from .*;/g;
      let match;
      let lastIndex = 0;
      while ((match = importRegex.exec(newContent)) !== null) {
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex === 0) {
        newContent = importStatement + newContent;
      } else {
        newContent = newContent.slice(0, lastIndex) + '\n' + importStatement + newContent.slice(lastIndex);
      }
    }
    
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
