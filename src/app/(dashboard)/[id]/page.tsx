function DashboardPage({ params }: { params: { id: string } }) {
  return <div>Dashboard Page for Event ID: {params.id}</div>;
}

export default DashboardPage;
