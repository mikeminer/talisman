import React, { useRef, useEffect, FC } from "react"
import { ArtifactCharacteristics, ParentSize, useCelestialArtifact } from "./useCelestialArtifact"
import { MysticalPhysics } from "./MysticalPhysics"

type MysticalCanvasProps = React.DetailedHTMLProps<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  HTMLCanvasElement
> & {
  config: MysticalPhysics
  size: ParentSize
  cx?: number
  cy?: number
}

const drawArtifact = (ctx: CanvasRenderingContext2D, artifact: ArtifactCharacteristics) => {
  const { cx, cy, radius, color, opacity } = artifact

  // gradient background
  const bg = ctx.createRadialGradient(cx, cy, radius / 2, cx, cy, radius)
  bg.addColorStop(0, color)
  bg.addColorStop(1, "transparent")

  ctx.globalAlpha = opacity
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
  ctx.fill()
  ctx.globalAlpha = 1
}

const MysticalCanvas: FC<MysticalCanvasProps> = ({ config, size, cx, cy, ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const artifact1 = useCelestialArtifact(config, size)
  const artifact2 = useCelestialArtifact(config, size)
  const acolyte = useCelestialArtifact(config, size, !!(cx && cy), cx, cy)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let animationFrameId: number

    // render on every frame
    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.filter = `blur(${config.blur}px)`
      drawArtifact(context, artifact1)
      drawArtifact(context, artifact2)
      drawArtifact(context, acolyte)

      animationFrameId = window.requestAnimationFrame(render)
    }

    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [artifact1, artifact2, acolyte, config])

  return <canvas ref={canvasRef} width={size.width} height={size.height} {...props} />
}

export default MysticalCanvas