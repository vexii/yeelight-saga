const COLORS = 16777215

export default function rainbow(step: number, numOfSteps = COLORS) {
  let r: number, g: number, b: number
  const h = 1 - step / numOfSteps
  const i = ~~(h * 6)
  const f = h * 6 - i
  const q = 1 - f
  switch (i % 6) {
    case 0:
      ;(r = 1), (g = f), (b = 0)
      break
    case 1:
      ;(r = q), (g = 1), (b = 0)
      break
    case 2:
      ;(r = 0), (g = 1), (b = f)
      break
    case 3:
      ;(r = 0), (g = q), (b = 1)
      break
    case 4:
      ;(r = f), (g = 0), (b = 1)
      break
    case 5:
      ;(r = 1), (g = 0), (b = q)
      break
  }
  var c =
    "#" +
      // @ts-ignore
    ("00" + (~~(r * 235)).toString(16)).slice(-2) +
      // @ts-ignore
    ("00" + (~~(g * 235)).toString(16)).slice(-2) +
      // @ts-ignore
    ("00" + (~~(b * 235)).toString(16)).slice(-2)
  return c
}
