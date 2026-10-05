import type { ReactNode } from 'react'
import { DependenciesContext, type AppDependencies } from './dependencies'

export function DependenciesProvider(props: { value: AppDependencies; children: ReactNode }) {
  return <DependenciesContext value={props.value}>{props.children}</DependenciesContext>
}
