import { useNavigate, useParams } from 'react-router'
import { ErrorPage, Loading } from '../components/PageState'
import { useExportArchive, useImportArchive } from '../hooks/useArchive'
import { useProject } from '../hooks/useProjects'
import { useCreateSpace, useDeleteSpace, useRenameSpace, useSpaceList } from '../hooks/useSpaces'
import { useI18n } from '../i18n/i18n'
import { CollectionPage } from './CollectionPage'

/** A project: the list of its spaces. */
export function ProjectPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const project = useProject(projectId)
  const spaces = useSpaceList(projectId)
  const create = useCreateSpace(projectId)
  const rename = useRenameSpace()
  const remove = useDeleteSpace(projectId)
  const exportJson = useExportArchive()
  const importJson = useImportArchive()

  if (project.isPending) return <Loading>{t('projects.loading')}</Loading>
  if (project.error) {
    return (
      <ErrorPage
        error={project.error}
        onRetry={() => void project.refetch()}
        backTo="/"
        backLabel={t('projects.backToList')}
      />
    )
  }

  return (
    <CollectionPage
      back={{ to: '/', label: t('projects.all') }}
      title={project.data.name}
      subtitle={t('project.spacesSubtitle')}
      placeholder={t('spaces.newPlaceholder')}
      empty={t('spaces.empty')}
      list={spaces}
      hrefOf={(space) => `/spaces/${space.id}`}
      create={{
        isPending: create.isPending,
        error: create.error,
        submit: (name) => create.mutate(name, { onSuccess: (space) => void navigate(`/spaces/${space.id}`) }),
      }}
      rename={(space, name) => rename.mutateAsync({ id: space.id, name })}
      remove={(space) => remove.mutateAsync(space.id)}
      exportJson={(space) => exportJson.mutateAsync({ kind: 'space', id: space.id, name: space.name })}
      importJson={{
        isPending: importJson.isPending,
        error: importJson.error,
        run: () =>
          importJson.mutate(
            { kind: 'space', projectId },
            { onSuccess: (imported) => imported?.kind === 'space' && void navigate(`/spaces/${imported.space.id}`) },
          ),
      }}
    />
  )
}
