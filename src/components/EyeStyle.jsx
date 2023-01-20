const EyeStyle = (letter) => {

  const unit = {
    translate: "em",
    rotate: "deg",
    skew: "deg"
  }

  // this might be a bit overkill right now, but wanna keep it flexible (still 2D only)
  let left = { translate: [], scale: [], rotate: [], skew: [] };
  let right = { translate: [], scale: [], rotate: [], skew: [] };

  switch (letter) {
    case "a" : left.translate = []; right.translate = []; break;
    case "b" : left.translate = []; right.translate = []; break;
    case "c" : left.translate = [0, -0.265]; right.translate = [0.14, -0.27]; break;
    case "d" : left.translate = []; right.translate = []; break;
    case "e" : left.translate = [-0.06, -0.265]; right.translate = [0.06, -0.265]; break;
    case "f" : left.translate = []; right.translate = []; break;
    case "g" : left.translate = [0.06, -0.27]; right.translate = [0.2, -0.252]; break;
    case "h" : left.translate = [-0.08, 0.015]; right.translate = [0.08, 0.015]; break;
    case "i" : left.translate = []; right.translate = []; break;
    case "j" : left.translate = []; right.translate = []; break;
    case "k" : left.translate = []; right.translate = []; break;
    case "l" : left.translate = []; right.translate = []; break;
    case "m" : left.translate = [-0.28, -0.25]; right.translate = [0.28, -0.25]; break;
    case "n" : left.translate = []; right.translate = []; break;
    case "o" : left.translate = [-0.225, -0.15]; right.translate = [0.225, -0.15]; break;
    case "p" : left.translate = [-0.06, -0.26]; right.translate = [0.06, -0.26]; break;
    case "q" : left.translate = []; right.translate = []; break;
    case "r" : left.translate = [-0.06, -0.265]; right.translate = [0.06, -0.265]; break;
    case "s" : left.translate = []; right.translate = []; break;
    case "t" : left.translate = [-0.19, -0.265]; right.translate = [0.19, -0.265]; break;
    case "u" : left.translate = [-0.218, -0.26]; right.translate = [0.218, -0.26]; break;
    case "v" : left.translate = []; right.translate = []; break;
    case "w" : left.translate = []; right.translate = []; break;
    case "x" : left.translate = []; right.translate = []; break;
    case "y" : left.translate = []; right.translate = []; break;
    case "z" : left.translate = []; right.translate = []; break;
    default: break;
  }

  const eye = {
    left: [
      left.translate.length ? "translate(" + left.translate.map(xy => xy + unit.translate).join(", ") + ")" : "",
      left.scale.length ? "scale(" + left.scale.join(", ") + ")" : "",
      left.rotate.length ? "rotate(" + left.rotate.map(xy => xy + unit.rotate).join(", ") + ")" : "",
      left.skew.length ? "rotate(" + left.skew.map(xy => xy + unit.skew).join(", ") + ")" : ""
    ],
    right: [
      right.translate.length ? "translate(" + right.translate.map(xy => xy + unit.translate).join(", ") + ")" : "",
      right.scale.length ? "scale(" + right.scale.join(", ") + ")" : "",
      right.rotate.length ? "rotate(" + right.rotate.map(xy => xy + unit.rotate).join(", ") + ")" : "",
      right.skew.length ? "rotate(" + right.skew.map(xy => xy + unit.skew).join(", ") + ")" : ""
    ]
  }

  return {
    left: { transform: eye.left.join(" ") },
    right: { transform: eye.right.join(" ") }
  };

}

export default EyeStyle;