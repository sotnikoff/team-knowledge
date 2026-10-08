import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useDependencies } from '../app/dependencies'

export function useRequestLoginCode() {
  const { requestLoginCode } = useDependencies()
  return useMutation({ mutationFn: (email: string) => requestLoginCode.execute({ email }) })
}

/** On success the session is stored; `useSession` picks it up. */
export function useVerifyLoginCode() {
  const { verifyLoginCode } = useDependencies()
  return useMutation({
    mutationFn: (input: { email: string; code: string }) => verifyLoginCode.execute(input),
  })
}

export function useCompleteProfile() {
  const { completeProfile } = useDependencies()
  return useMutation({
    mutationFn: (input: { name: string; company: string }) => completeProfile.execute(input),
  })
}

/** Signs out and forgets everything cached for this user. */
export function useLogout(): () => void {
  const { logout } = useDependencies()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return () => {
    logout.execute()
    queryClient.clear()
    void navigate('/login', { replace: true })
  }
}
