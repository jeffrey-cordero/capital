import Spinner from 'react-bootstrap/Spinner';

export default function Loading() {
  return (
    <div className='loading'>
      <Spinner animation="border" role="status" variant='primary'>
         <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}