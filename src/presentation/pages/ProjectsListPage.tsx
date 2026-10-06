import { useNavigate } from 'react-router'
import { useExportArchive, useImportArchive } from '../hooks/useArchive'
import { useCreateProject, useDeleteProject, useProjectList, useRenameProject } from '../hooks/useProjects'
import { useI18n } from '../i18n/i18n'
import { CollectionPage } from './CollectionPage'

/** Home: all projects. */
export function ProjectsListPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const projects = useProjectList()
  const create = useCreateProject()
  const rename = useRenameProject()
  const remove = useDeleteProject()
  const exportJson = useExportArchive()
  const importJson = useImportArchive()

  return (
    <CollectionPage
      title={t('projects.title')}
      subtitle={t('projects.subtitle')}
      placeholder={t('projects.newPlaceholder')}
      empty={t('projects.empty')}
      list={projects}
      hrefOf={(project) => `/projects/${project.id}`}
      create={{
        isPending: create.isPending,
        error: create.error,
        submit: (name) => create.mutate(name, { onSuccess: (project) => void navigate(`/projects/${project.id}`) }),
      }}
      rename={(project, name) => rename.mutateAsync({ id: project.id, name })}
      remove={(project) => remove.mutateAsync(project.id)}
      exportJson={(project) => exportJson.mutateAsync({ kind: 'project', id: project.id, name: project.name })}
      importJson={{
        isPending: importJson.isPending,
        error: importJson.error,
        run: () =>
          importJson.mutate(
            { kind: 'project' },
            { onSuccess: (imported) => imported?.kind === 'project' && void navigate(`/projects/${imported.project.id}`) },
          ),
      }}
    />
  )
}
