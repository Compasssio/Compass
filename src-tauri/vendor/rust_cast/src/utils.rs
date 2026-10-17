use crate::errors::Error;
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use std::io::Cursor;

pub fn read_u32_from_buffer(buffer: &[u8]) -> Result<u32, Error> {
    Ok(Cursor::new(buffer).read_u32::<BigEndian>()?)
}

pub fn write_u32_to_buffer(number: u32) -> Result<Vec<u8>, Error> {
    let mut buffer = vec![];

    buffer.write_u32::<BigEndian>(number)?;

    Ok(buffer)
}

pub fn to_vec<M: protobuf::Message>(message: &M) -> Result<Vec<u8>, Error> {
    let mut buffer = vec![];

    message.write_to_writer(&mut buffer)?;

    Ok(buffer)
}

pub fn from_vec<M: protobuf::Message>(buffer: Vec<u8>) -> Result<M, Error> {
    let mut read_buffer = Cursor::new(buffer);

    Ok(M::parse_from_reader(&mut read_buffer)?)
}
