export const examples = [
  {
    name: { en: 'Star', fr: 'Étoile' },
    code: `# Draw a star
pencolor 255, 50, 50
penwidth 2
repeat 5 {
  forward 100
  turnright 144
}
`,
  },
  {
    name: { en: 'Spiral', fr: 'Spirale' },
    code: `# Spiral
pencolor 30, 100, 200
$i = 1
while $i < 200 {
  forward $i
  turnright 45
  $i = $i + 2
}
`,
  },
  {
    name: { en: 'Square', fr: 'Carré' },
    code: `# Draw a square using a function
learn square $size {
  repeat 4 {
    forward $size
    turnright 90
  }
}

pencolor 80, 0, 180
penwidth 2
square 100
`,
  },
  {
    name: { en: 'Coloured squares', fr: 'Carrés colorés' },
    code: `# Nested coloured squares
penwidth 2
for $i = 1 to 36 {
  pencolor $i * 7, $i * 4, 200
  forward $i * 5
  turnright 91
}
`,
  },
  {
    name: { en: 'Tree', fr: 'Arbre' },
    code: `# Recursive tree
learn tree $size {
  if $size < 5 {
    return
  }
  forward $size
  turnleft 30
  tree $size * 0.7
  turnright 60
  tree $size * 0.7
  turnleft 30
  backward $size
}

pencolor 80, 50, 20
penwidth 2
direction 0
tree 80
`,
  },
  {
    name: { en: 'Sierpinski triangle', fr: 'Triangle de Sierpinski' },
    code: `# Sierpinski triangle
learn sierpinski $step, $distance {
  assert $step >= 0 and $distance > 0

  if $step > 0 {
    forward $distance / 2
    turnleft 120
    sierpinski $step - 1, $distance / 2
    turnright 120
    forward $distance / 2
    turnright 120

    forward $distance / 2
    turnleft 120
    sierpinski $step - 1, $distance / 2
    turnright 120
    forward $distance / 2
    turnright 120

    forward $distance / 2
    turnleft 120
    sierpinski $step - 1, $distance / 2
    turnright 120
    forward $distance / 2
    turnright 120
  } else {
    forward $distance
    turnright 120
    forward $distance
    turnright 120
    forward $distance
    turnright 120
  }
}

reset
go 100, 200
turnright 90
sierpinski 6, 200
`,
  },
  {
    name: { en: 'Von Koch snowflake', fr: 'Flocon de Von Koch' },
    code: `# Von Koch snowflake
learn von_koch $size, $order {
  if $order == 0 {
    forward $size
    return
  }
  von_koch $size / 3, $order - 1
  turnleft 60
  von_koch $size / 3, $order - 1
  turnright 120
  von_koch $size / 3, $order - 1
  turnleft 60
  von_koch $size / 3, $order - 1
}

reset
pencolor 0, 100, 200
go 100, 150
direction 90

repeat 3 {
  von_koch 400, 3
  turnright 120
}
`,
  },
];
