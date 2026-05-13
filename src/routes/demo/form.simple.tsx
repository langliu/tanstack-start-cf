import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { useAppForm } from '#/hooks/demo.form'

export const Route = createFileRoute('/demo/form/simple')({
  component: SimpleForm,
})

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  title: z.string().min(1, 'Title is required'),
})

function SimpleForm() {
  const form = useAppForm({
    defaultValues: {
      description: '',
      title: '',
    },
    onSubmit: ({ value }) => {
      console.log(value)
      // Show success message
      alert('Form submitted successfully!')
    },
    validators: {
      onBlur: schema,
    },
  })

  return (
    <div
      className='flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-white'
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 5% 40%, #add8e6 0%, #0000ff 70%, #00008b 100%)',
      }}
    >
      <div className='w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10'>
        <form
          className='space-y-6'
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.AppField name='title'>
            {(field) => <field.TextField label='Title' />}
          </form.AppField>

          <form.AppField name='description'>
            {(field) => <field.TextArea label='Description' />}
          </form.AppField>

          <div className='flex justify-end'>
            <form.AppForm>
              <form.SubscribeButton label='Submit' />
            </form.AppForm>
          </div>
        </form>
      </div>
    </div>
  )
}
