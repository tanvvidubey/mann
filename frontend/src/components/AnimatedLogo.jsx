const LOTTIE_AVATAR_GIF =
  'https://assets-v2.lottiefiles.com/a/0835f618-1176-11ee-9943-d3551f5e4bfd/926JZFgm0L.gif'

export default function AnimatedLogo({ className = 'h-8 w-8' }) {
  return (
    <span className={`inline-block overflow-hidden rounded-full ${className}`}>
      <img
        src={LOTTIE_AVATAR_GIF}
        alt=""
        className="h-full w-full scale-150 object-cover object-center border-0 outline-none ring-0"
        aria-hidden="true"
      />
    </span>
  )
}
