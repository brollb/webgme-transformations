use crate::gme::NodeId;
use derive_more::{Display, Error};

//#[derive(Debug, Display, Error)]
pub(crate) enum Error {
    NodeNotFoundError(NodeId),
}
