import type { HTMLMotionProps, MotionValue } from 'framer-motion'

/**
 * framer-motion resolves its own copy of @types/react, so a plain ReactNode from
 * this app is not assignable to a motion element's children. Borrowing the
 * type from framer (minus its MotionValue members) keeps the primitives
 * type-safe without a cast per call.
 */
export type MotionChildren = Exclude<HTMLMotionProps<'div'>['children'], MotionValue<number> | MotionValue<string>>
