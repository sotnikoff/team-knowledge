import { useNavigate } from 'react-router'
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
    />
  )
}
